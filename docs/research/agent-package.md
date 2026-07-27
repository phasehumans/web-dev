# Architecture & Design Document: `@december/agent`

## 1. Executive Summary & Core Purpose

`packages/agent` (`@december/agent`) is the central execution runtime for the December autonomous coding agent. It encapsulates the core cognitive loop, state management, tool execution lifecycle, event streaming, context window management, and resilience mechanisms of the agent.

### The Fundamental Problem Statement

Large Language Models (LLMs) are stateless text-in, text-out API endpoints. Building an autonomous coding agent requires solving several core infrastructure challenges that stateless endpoints cannot handle:

1. **Stateful Conversation Lifecycle**: Maintaining message history, tracking turn sequences, supporting parent-child message relationships, and enabling context save/load/fork operations.
2. **Autonomous Tool Dispatch & Loop Execution**: Converting LLM structured tool call requests into system commands (file I/O, terminal execution, search), capturing execution updates, feeding results back to the model, and repeating until a task completes or user intervention occurs.
3. **Environment Decoupling**: Executing agent turns uniformly across disparate physical environments (e.g. local CLI running Bun/Node child processes, cloud sandboxes executing via gRPC/HTTP remote operations, or sidecar daemons) without changing the core agent code.
4. **Context Window Constraint Optimization**: Monitoring token usage against provider model limits and automatically summarizing older conversation history before context window overflow occurs.
5. **Real-time Asynchronous Event Streaming**: Emitting granular execution events (thinking deltas, stream chunks, tool call updates, token usage) to consuming frontends (TUI, Web UI, RPC clients) without blocking the execution loop.
6. **Asynchronous Steering & Follow-up Queueing**: Allowing users or background hooks to inject steering messages mid-turn or stage follow-up tasks post-turn.

By abstracting these primitives into `@december/agent`, the rest of the monorepo (`apps/cli`, `apps/worker`, `apps/sidecar`, `packages/tui`) consumes a standardized agent engine.

---

## 2. First-Principles Primitives & Abstractions

The `@december/agent` package builds its execution engine around nine fundamental primitives:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Agent Engine                               │
├──────────────────┬──────────────────────┬───────────────────────────────┤
│ Conversation     │ Multi-Queue System   │ Autonomous Execution Loop     │
│ Manager          │ - Steering Queue     │ - Outer Loop (Follow-ups)     │
│ (Message Graph)  │ - Follow-Up Queue    │ - Inner Loop (100 Turns Max)  │
├──────────────────┼──────────────────────┼───────────────────────────────┤
│ Event Generator  │ Context Compactor    │ Platform Adapter              │
│ (AsyncQueue<T>)  │ (Token Estimator &   │ (Environment Inversion of     │
│                  │ Structured Summary)  │ Control)                      │
├──────────────────┼──────────────────────┼───────────────────────────────┤
│ Agent Harness    │ Event Proxy          │ Session Repository            │
│ (Skills & Rules) │ (RPC Serialization)  │ (Persistence Layer)           │
└──────────────────┴──────────────────────┴───────────────────────────────┘
```

### 1. Conversation & Message Graph

- **File**: [`packages/agent/src/conversation-manager.ts`](file:///home/chaitanya/code/december/packages/agent/src/conversation-manager.ts#L8-L58)
- **Role**: Manages `AgentMessage` arrays ([`packages/shared/src/types.ts:L18-L24`](file:///home/chaitanya/code/december/packages/shared/src/types.ts#L18-L24)). Every message added automatically receives a UUID (`id`), parent ID pointer (`parentId`), and timestamp.

### 2. Dual Pending Message Queues (`PendingMessageQueue`)

- **File**: [`packages/agent/src/agent.ts:L23-L50`](file:///home/chaitanya/code/december/packages/agent/src/agent.ts#L23-L50)
- **Role**: Manages out-of-band messages:
    - **Steering Queue**: Injects messages _before_ a turn begins (e.g. user mid-turn redirection or hook-driven steering).
    - **Follow-Up Queue**: Injects messages _after_ an inner loop finishes (e.g. chained multi-step commands).
    - Supports `'all'` (drain all queued items at once) or `'one-at-a-time'` modes.

### 3. Thread-Safe Event Generator Queue (`AsyncQueue<T>`)

- **File**: [`packages/agent/src/agent-loop.ts:L10-L47`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L10-L47)
- **Role**: An asynchronous push-and-pull queue implementing `Symbol.asyncIterator`. Allows asynchronous background operations (LLM streaming, tool output chunks) to push `AgentEvent` objects without blocking, while `runAgentLoop` yields them asynchronously to the caller.

### 4. Platform Adapter (Environment Decoupling)

- **File**: [`packages/agent/src/platform-adapter.ts:L1-L32`](file:///home/chaitanya/code/december/packages/agent/src/platform-adapter.ts#L1-L32)
- **Role**: Defines the filesystem (`fs`), terminal (`bash`), search (`search`), UI (`ui`), environment variables (`env`), and browser navigation (`browser`) contracts. Core tools execute against this interface, allowing identical tool code to run locally or inside a remote sandbox.

### 5. Context Window Auto-Compactor

- **File**: [`packages/agent/src/utils/compaction.ts`](file:///home/chaitanya/code/december/packages/agent/src/utils/compaction.ts#L16-L174)
- **Role**: Estimates token count (`Math.ceil((text.length + toolInput.length) / 4)`). When current conversation token usage reaches **80%** of the model context limit (`MODEL_CONTEXT_WINDOWS`), it triggers an LLM call to compress middle messages into a structured memory summary (Goal, Constraints, Progress, Key Decisions, Next Steps, Critical Context), preserving the system prompt and the latest 20 messages.

### 6. Resilience & Retry Engine

- **File**: [`packages/agent/src/agent-loop.ts:L215-L316`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L215-L316)
- **Role**: Wraps LLM stream calls with `p-retry` (up to 5 retries with exponential backoff). Catches `429` rate limits and emits `AgentStatus` warning events to notify the user.

### 7. Execution Mode Dispatcher (Tool Execution)

- **File**: [`packages/agent/src/agent-loop.ts:L373-L392`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L373-L392)
- **Role**: Examines requested tool calls. If any tool requires sequential execution (e.g. `bash`, `write_file`, `edit_file`, `edit_diff` or explicit `executionMode === 'sequential'`), it runs all tool calls in series; otherwise, it runs non-interfering tools in parallel via `Promise.all`.

### 8. System Harness & Workspace Discoverer

- **File**: [`packages/agent/src/harness/agent-harness.ts:L13-L123`](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts#L13-L123)
- **Role**: Scans `.december/skills/` and `.december/rules/` within the user workspace, formats instructions inside `<project_context>` tags, appends slash command definitions (`/plan`, `/schedule`), and constructs the complete system prompt.

### 9. Event Streaming Proxy

- **File**: [`packages/agent/src/proxy.ts:L9-L29`](file:///home/chaitanya/code/december/packages/agent/src/proxy.ts#L9-L29)
- **Role**: Serializes yielded `AgentEvent` objects to JSON strings over RPC or WebSockets (`rpc.sendEvent`).

---

## 3. System Architecture & Module Breakdown

```
packages/agent/src/
├── index.ts                  # Package entry point
├── agent.ts                  # Core Agent & PendingMessageQueue class
├── agent-loop.ts             # Outer/Inner loops, AsyncQueue, LLM stream, Tool runner
├── conversation-manager.ts   # Message history & compaction trigger logic
├── platform-adapter.ts       # Environment abstraction interface
├── proxy.ts                  # RPC streaming proxy
├── harness/
│   ├── agent-harness.ts      # Workspace skills, rules, and system prompt builder
│   └── session-repository.ts # Session persistence interface
└── utils/
    └── compaction.ts         # Token estimation & LLM summarization pipeline
```

### Module Responsibilities Detail

| Module Path                                                                                                                  | Core Responsibilities                                                                                     | Key Exported Entities                          | Primary Dependencies                                             |
| :--------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :--------------------------------------------- | :--------------------------------------------------------------- |
| [`src/agent.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent.ts)                                           | Holds runtime state, steering/follow-up queues, active abort controller, and context persistence methods. | `Agent`, `AgentConfig`, `PendingMessageQueue`  | `ConversationManager`, `@december/providers`, `@december/shared` |
| [`src/agent-loop.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts)                                 | Executes turn loops, retries API calls, streams LLM output, handles interrupts, dispatches tools.         | `runAgentLoop`                                 | `p-retry`, `util`, `@december/shared`                            |
| [`src/conversation-manager.ts`](file:///home/chaitanya/code/december/packages/agent/src/conversation-manager.ts)             | Encapsulates array of `AgentMessage`s, handles ID/timestamp assignment, delegates compaction.             | `ConversationManager`                          | `uuid`, `compaction.ts`                                          |
| [`src/platform-adapter.ts`](file:///home/chaitanya/code/december/packages/agent/src/platform-adapter.ts)                     | Specifies required host operations for filesystem, shell execution, search, and UI permission hooks.      | `PlatformAdapter`                              | None (pure TS interface)                                         |
| [`src/utils/compaction.ts`](file:///home/chaitanya/code/december/packages/agent/src/utils/compaction.ts)                     | Calculates message token usage, checks 80% context threshold, calls LLM for structured compaction.        | `compactContextIfNeeded`, `DEFAULT_MAX_TOKENS` | `@december/providers`                                            |
| [`src/harness/agent-harness.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts)           | Discovers `.december/skills` and `.december/rules`, formats slash commands, initializes `Agent`.          | `AgentHarness`, `HarnessConfig`                | `node:fs`, `node:path`, `Agent`                                  |
| [`src/harness/session-repository.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/session-repository.ts) | Persistence contract for loading and saving agent message sessions.                                       | `SessionRepository`                            | `@december/shared`                                               |
| [`src/proxy.ts`](file:///home/chaitanya/code/december/packages/agent/src/proxy.ts)                                           | Provides WebSocket/RPC streaming layer wrapper around `runAgentLoop`.                                     | `EventStreamingProxy`, `RpcProxyContext`       | `runAgentLoop`                                                   |

---

## 4. End-to-End Control & Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as User / TUI / RPC Proxy
    participant Loop as runAgentLoop / runInnerLoop
    participant Compact as compaction.ts
    participant LLM as LLMProvider (@december/providers)
    participant Tools as Tool Execution Engine
    participant Repo as SessionRepository

    Client->>Loop: runAgentLoop(agent, userInput)
    Loop->>Loop: Add User Message & Save Context
    Loop->>Client: Yield AgentStart

    loop Outer Loop (Follow-Up Queue)
        loop Inner Turn Loop (Turn 1..100)
            Loop->>Loop: Drain Steering Queue & Inject Messages
            Loop->>Client: Yield TurnStart

            Loop->>Compact: compactIfNeeded(llm, modelOptions)
            alt Token Usage >= 80% Capacity
                Compact->>LLM: Stream Compaction Summary Request
                LLM-->>Compact: Structured Memory Checkpoint
                Compact-->>Loop: Replace Middle History with Summary
                Loop->>Client: Yield ContextCompacted Event
            end

            Loop->>LLM: stream(messages, tools, systemPrompt)
            loop Streaming Response Chunks
                LLM-->>Loop: text / thinking_delta / tool_call_delta / usage
                Loop->>Client: Yield StreamChunk / ThinkingChunk / AgentUsage
            end

            alt No Tool Calls Requested
                Loop->>Loop: Append Assistant Message
                Loop->>Repo: saveContext()
                Loop->>Client: Yield TurnEnd
            else Tool Calls Present
                Loop->>Loop: Append Assistant Message with toolCalls
                Loop->>Tools: executeToolCalls(toolCalls)

                alt Sequential Tools (bash, write_file, edit_file)
                    loop Each Tool Call
                        Tools->>Client: Yield ToolCallStart
                        Tools->>Tools: Permission Check (ui.requestPermission)
                        Tools->>Tools: Execute Tool & Stream Output
                        Tools->>Client: Yield ToolExecutionUpdate & ToolCallResult
                    end
                else Parallel Tools
                    Tools->>Tools: Promise.all(executeSingleTool)
                    Tools->>Client: Yield ToolCallStart & ToolCallResult
                end

                Loop->>Loop: Append Tool Result Messages
                Loop->>Repo: saveContext()
                Loop->>Client: Yield TurnEnd
            end
        end

        alt FollowUp Queue Has Messages
            Loop->>Loop: Drain FollowUp Queue & Continue Outer Loop
        end
    end

    Loop->>Client: Yield AgentEnd
```

### Flow Breakdown

1. **Invocation**: Calling `runAgentLoop(agent, userInput)` ([`agent-loop.ts:L90`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L90)) creates an `AsyncQueue<AgentEvent>` and instantiates an `AbortController`.
2. **Input Ingestion**: The optional `userInput` string is added as a `{ role: 'user', content: userInput }` message and context is saved ([`agent-loop.ts:L98-L101`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L98-L101)).
3. **Turn Loop Initiation**: `runInnerLoop` runs up to 100 turns ([`agent-loop.ts:L145`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L145)).
4. **Steering Processing**: Before requesting LLM responses, steering messages (from `hooks.getSteeringMessages()` or `agent.steeringQueue`) are drained and appended ([`agent-loop.ts:L149-L160`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L149-L160)).
5. **Context Compaction Check**: `streamAssistantResponse` calls `agent.conversation.compactIfNeeded(...)` ([`agent-loop.ts:L221`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L221)). If tokens exceed 80% limit, middle history is summarized into a structured checkpoint.
6. **LLM Generation**: Messages are converted via `agent.convertToLlm` (which strips non-LLM UI messages like `isUI: true`) and sent to `agent.llm.stream(...)` ([`agent-loop.ts:L247`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L247)).
7. **Chunk Handling**: Stream chunks are processed in real-time. Text deltas emit `StreamChunk`, thinking deltas emit `ThinkingChunk`, tool call deltas are accumulated into `activeToolCalls`, and usage statistics emit `AgentUsage` ([`agent-loop.ts:L260-L288`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L260-L288)).
8. **Tool Execution**:
    - If tool calls are requested, `executeToolCalls` determines execution mode ([`agent-loop.ts:L373`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L373)).
    - Permissions are checked via `agent.operations.ui.requestPermission` ([`agent-loop.ts:L406`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L406)).
    - Tool argument preparation (`tool.prepareArguments`) and streaming output (`onStream` -> `ToolExecutionUpdate`) are executed ([`agent-loop.ts:L420-L432`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L420-L432)).
    - `hooks.afterToolCall` allows hooks to inspect or mutate output ([`agent-loop.ts:L440`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L440)).
    - Results are converted into `{ role: 'tool', content, toolCallId }` messages ([`agent-loop.ts:L467`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L467)).
9. **Turn Termination & Follow-ups**: Context is persisted via `saveContext()`. If the LLM produces no tool calls or `hooks.shouldStopAfterTurn()` returns true, the inner loop ends. `runOuterLoop` then checks `agent.followUpQueue` for pending follow-up messages ([`agent-loop.ts:L129`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L129)).

---

## 5. Key Monorepo Integration Points

`packages/agent` interfaces clean-room style with other workspace packages:

```
                      ┌──────────────────────────┐
                      │    @december/shared      │
                      │ (AgentMessage, AgentEvent│
                      │  Tool, AgentHooks, etc.) │
                      └─────────────┬────────────┘
                                    │
                                    ▼
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│   @december/providers    │─►│      @december/agent     │◄─│     @december/tools      │
│ (LLMProvider interface,  │  │  (Core Execution Engine) │  │  (Tool execution logic   │
│  MODEL_CONTEXT_WINDOWS)  │  └─────────────┬────────────┘  │   via PlatformAdapter)   │
└──────────────────────────┘                │               └──────────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
      ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
      │    apps/cli     │          │   apps/worker   │          │  apps/sidecar   │
      │ (Local CLI TUI) │          │ (Cloud Sandbox) │          │(Daemon Service) │
      └─────────────────┘          └─────────────────┘          └─────────────────┘
```

1. **`@december/shared`**: Provides all common domain types ([`packages/shared/src/types.ts`](file:///home/chaitanya/code/december/packages/shared/src/types.ts#L1-L172)), such as `AgentMessage`, `Tool`, `ToolCall`, `ToolResult`, `AgentHooks`, and the 16 `AgentEvent` variants.
2. **`@december/providers`**: Provides the uniform `LLMProvider` interface ([`packages/providers/src/types.ts:L29-L45`](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L29-L45)) and context window limits ([`packages/providers/src/models.ts:L3-L9`](file:///home/chaitanya/code/december/packages/providers/src/models.ts#L3-L9)).
3. **`@december/tools`**: Implements individual tools (`bash`, `read_file`, `write_file`, `edit_file`, `edit_diff`, etc.) that execute using `PlatformAdapter` methods.
4. **`apps/cli`**: Instantiates `AgentHarness` and `Agent` with `localOperations` ([`apps/cli/src/local-operations.ts`](file:///home/chaitanya/code/december/apps/cli/src/local-operations.ts#L15)) and `FileSessionRepository`.
5. **`apps/worker` & `apps/sidecar`**: Instantiates `Agent` using remote sandbox operations (`remoteOperations`) to execute runs securely in isolated cloud environments.

---

## 6. Verification & Test Suite Overview

`packages/agent` includes comprehensive unit and integration tests under `packages/agent/test/`:

- **Unit Tests**:
    - [`test/unit/agent.unit.test.ts`](file:///home/chaitanya/code/december/packages/agent/test/unit/agent.unit.test.ts): Tests `Agent` configuration, message addition, system prompt defaults, steering queue, follow-up queue, and context operations (`saveContext`, `loadContext`, `clearContext`, `forkContext`).
    - [`test/unit/compaction.unit.test.ts`](file:///home/chaitanya/code/december/packages/agent/test/unit/compaction.unit.test.ts): Tests context window token calculation and compaction triggering when threshold is breached.
    - [`test/unit/conversation-manager.unit.test.ts`](file:///home/chaitanya/code/december/packages/agent/test/unit/conversation-manager.unit.test.ts): Verifies parent ID assignment, timestamp generation, UUID creation, and message graph immutability.
    - [`test/unit/proxy.unit.test.ts`](file:///home/chaitanya/code/december/packages/agent/test/unit/proxy.unit.test.ts): Validates event serialization through `EventStreamingProxy`.
- **Integration Tests**:
    - [`test/integration/agent-loop.integration.test.ts`](file:///home/chaitanya/code/december/packages/agent/test/integration/agent-loop.integration.test.ts): Uses `MockLLM` ([`test/mock-provider.ts`](file:///home/chaitanya/code/december/packages/agent/test/mock-provider.ts#L4-L18)) to simulate full multi-turn prompt-tool cycles, rate-limit retries, steering injections, and interrupt handling.

---

## 7. Primary Source File Map Reference

- [`packages/agent/package.json`](file:///home/chaitanya/code/december/packages/agent/package.json#L1-L34)
- [`packages/agent/src/index.ts`](file:///home/chaitanya/code/december/packages/agent/src/index.ts#L1-L9)
- [`packages/agent/src/agent.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent.ts#L1-L172)
- [`packages/agent/src/agent-loop.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L1-L496)
- [`packages/agent/src/conversation-manager.ts`](file:///home/chaitanya/code/december/packages/agent/src/conversation-manager.ts#L1-L59)
- [`packages/agent/src/platform-adapter.ts`](file:///home/chaitanya/code/december/packages/agent/src/platform-adapter.ts#L1-L33)
- [`packages/agent/src/proxy.ts`](file:///home/chaitanya/code/december/packages/agent/src/proxy.ts#L1-L30)
- [`packages/agent/src/harness/agent-harness.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts#L1-L123)
- [`packages/agent/src/harness/session-repository.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/session-repository.ts#L1-L9)
- [`packages/agent/src/utils/compaction.ts`](file:///home/chaitanya/code/december/packages/agent/src/utils/compaction.ts#L1-L175)

---

_Research analysis complete. All findings backed by primary source code._
