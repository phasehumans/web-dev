# TUI Chat Interface & Stream Testing Architecture in December

This document presents comprehensive research and a concrete technical specification for offline testing, mocking, stream simulation, and UI verification in **December**. It details how event streams, tool call outputs, agent messages, and git diffs are processed in the codebase, evaluates industry patterns and libraries for LLM mock streaming, and defines the implementation plan for a `--mock` provider and test harness.

---

## 1. Current Architecture & Event Stream Lifecycle

The December architecture processes AI responses and updates the Terminal User Interface (TUI) through a multi-layered event pipeline.

```
[LLM Provider] (AsyncGenerator<ProviderStreamChunk>)
       │
       ▼
[Agent Loop] (@december/agent - runAgentLoop)
       │ yields AgentEvent stream (WireAgentEvent)
       ▼
[CLI Stream Processor] (use-agent-runner.ts - processAgentStream)
       │ throttles & flushes every 50ms into MessageBlock[]
       ▼
[TUI Components] (@december/tui - BotMessage & StyledCommand)
       │ renders Ink layout (Terminal output)
```

### 1.1 Provider Streaming Layer (`packages/providers`)

- **Interface**: Defined in [`packages/providers/src/types.ts`](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L29-L45):
    ```typescript
    export interface LLMProvider {
        id: string
        stream(
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown>
    }
    ```
- **Stream Chunks** (`ProviderStreamChunk` in [`packages/providers/src/types.ts`](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L22-L27)):
    - `{ type: 'text', text: string }`
    - `{ type: 'thinking_delta', text: string }`
    - `{ type: 'tool_call', toolCall: ToolCall }`
    - `{ type: 'tool_call_delta', id: string, name?: string, inputDelta: string }`
    - `{ type: 'usage', promptTokens: number, completionTokens: number }`

### 1.2 Agent Reasoning Loop & Events (`packages/agent` & `packages/shared`)

- The agent loop (`packages/agent/src/agent-loop.ts`) consumes provider chunks, manages tool execution via `PlatformAdapter`, and yields typed events (`AgentEvent` in [`packages/shared/src/types.ts`](file:///home/chaitanya/code/december/packages/shared/src/types.ts#L139-L156)).
- **Key Agent Events**:
    - `TurnStart` & `TurnEnd`
    - `StreamChunk` (`{ type: 'StreamChunk', content: string }`)
    - `ThinkingChunk` (`{ type: 'ThinkingChunk', content: string }`)
    - `ToolCallStart` (`{ type: 'ToolCallStart', toolCall: ToolCall }`)
    - `ToolExecutionUpdate` (`{ type: 'ToolExecutionUpdate', toolCallId: string, chunk: string }`)
    - `ToolCallResult` (`{ type: 'ToolCallResult', result: ToolResult }`)
    - `ContextCompacted`, `AgentStatus`, `AgentUsage`, `AgentError`, `AgentInterrupt`, `FileModified`.
- **Wire Protocol**: `toWire()` and `fromWire()` ([`packages/shared/src/types.ts`](file:///home/chaitanya/code/december/packages/shared/src/types.ts#L162-L171)) serialize events into raw JSON payloads for IPC or Firecracker microVM `vsock` relaying.

### 1.3 CLI Event Batching & State Machine (`apps/cli`)

- **Hook Layer** (`apps/cli/src/hooks/use-agent-session.ts`): Invokes `runAgentLoop(agent, prompt)` and feeds the stream into `processAgentStream`.
- **Throttled Stream Processor** ([`apps/cli/src/hooks/use-agent-runner.ts`](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-runner.ts#L11-L183)):
    - Collects incoming `AgentEvent` items into a buffer.
    - Flushes updates every **50ms** (`flushTimeout`) to prevent excessive React re-renders in Ink TUI.
    - Transforms raw `AgentEvent` items into UI blocks (`MessageBlock` state in Ink).

### 1.4 Ink TUI Rendering & Git Diff Formatting (`packages/tui`)

- **BotMessage Component** ([`packages/tui/src/components/messages/bot-message.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/messages/bot-message.tsx)):
    - **Tool Commands (`StyledCommand`)**: Formats tool function calls (e.g. `edit_file(path: "src/index.ts")`) in yellow `#fef08a`.
    - **Git Diff Renderer** ([`bot-message.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/messages/bot-message.tsx#L213-L314)): Intercepts `edit_file`, `edit_diff`, `replace_file_content`, `write_file`, and `multi_replace_file_content`. Parses unified diff strings or full file content, formatting:
        - Additions (`+`): Green text `#6EE7B7` on dark green background `#122f1e`.
        - Deletions (`-`): Red text `#FCA5A5` on dark red background `#3f1316`.
        - Hunk headers (`@@`): Purple text `#a78bfa`.
    - **Thinking & Markdown**: Renders collapsible `<thought>` blocks (`CollapsibleThought`) and animated Markdown text (`SmoothMarkdown`).

---

## 2. Best Practices, Mocking Patterns & Tooling Evaluation

### 2.1 Mocking LLM Providers & Streams

1. **AsyncGenerator Mocking (Native TS/JS Pattern)**:
    - December's provider abstraction (`LLMProvider`) relies directly on ES AsyncGenerators (`AsyncGenerator<ProviderStreamChunk>`).
    - A mock provider can return generator functions using `async function*` with artificial delays (`await new Promise(r => setTimeout(r, delay))`).
2. **Vercel AI SDK Comparison (`MockLanguageModelV1` / `simulateReadableStream`)**:
    - Vercel AI SDK uses `ReadableStream<LanguageModelV1StreamPart>` with helper utilities like `simulateReadableStream({ chunks: [...] })`.
    - _Recommendation for December_: Because December uses native TS `AsyncGenerator`, we can build a lightweight `simulateChunkStream(chunks, delayMs)` helper without adding extra SDK dependencies.

### 2.2 Event Replay vs. Procedural Generators

| Strategy                      | Mechanics                                                                          | Strengths                                                        | Weaknesses                                          |
| :---------------------------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------------------- | :-------------------------------------------------- |
| **Fixture Event Replay**      | Replays recorded `.json` or `.jsonl` files containing sequence of `WireAgentEvent` | 100% realistic; catches regression bug in exact stream sequences | Static; rigid against prompt/tool signature changes |
| **Procedural Mock Generator** | Dynamically emits chunks based on prompt rules/regex matching                      | Flexible; simulates complex back-and-forth interactions          | Requires writing rule sets for custom test cases    |

_Decision_: December should support **both**:

- **Procedural Generator Mode** for offline CLI development (`--mock`).
- **Fixture Replay Mode** for automated TUI component unit/integration tests (`--mock-fixture=<path>`).

### 2.3 TUI Stream Testing with `ink-testing-library`

- `ink-testing-library` provides a virtual stdout stream for Ink React components.
- Key Methods:
    - `const { lastFrame, stdin, rerender, unmount } = render(<BotMessage blocks={...} />)`
    - `stdin.write('input text')` simulates user keystrokes.
    - `lastFrame()` captures ANSI-formatted strings or text snapshots.
- **Handling ANSI & Terminal Width**: Use `strip-ansi` to assert text contents clean of ANSI color codes in CI environments.

### 2.4 Mocking Git Diffs & Tool Executions

- In mock mode, actual OS filesystem modifications should be avoided.
- Decouple tool execution using a `MockPlatformAdapter` or pre-populated tool responses. The UI diff block parser (`bot-message.tsx`) only requires the structured diff string (`parsedInput.diff` or `parsedInput.content`) inside the `ToolCallStart` / `ToolCallResult` event blocks.

---

## 3. Mock Provider & Event Simulator Design Specification

### 3.1 Architecture Overview

```
                          ┌───────────────────────────┐
                          │    LLMProvider Interface  │
                          └─────────────▲─────────────┘
                                        │ implements
                          ┌─────────────┴─────────────┐
                          │     MockLLMProvider       │
                          └─────────────▲─────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
┌──────────┴──────────┐                                   ┌──────────┴──────────┐
│ Procedural Scenario │                                   │ Fixture Event Player │
│     Generator       │                                   │   (JSON/JSONL logs)  │
└─────────────────────┘                                   └─────────────────────┘
```

### 3.2 Key Specifications

#### 1. CLI Flags & Environment Variables

- Flag: `--mock` (Enables mock provider with default scenario).
- Flag: `--mock-fixture=<path>` (Replays a specific JSON event fixture file).
- Flag: `--mock-delay=<ms>` (Sets delay between stream chunks; default: `15ms`).
- Env Var: `DECEMBER_MOCK=true` or `DECEMBER_MOCK_FIXTURE=<path>`.

#### 2. Mock Provider Implementation (`packages/providers/src/providers/mock.ts`)

```typescript
import type { LLMProvider, Message, ProviderTool, ProviderStreamChunk } from '../types.ts'

export interface MockScenario {
    match?: RegExp | string
    chunks: ProviderStreamChunk[]
    chunkDelayMs?: number
}

export class MockLLMProvider implements LLMProvider {
    public id = 'mock'
    private defaultDelay: number
    private scenarios: MockScenario[]
    private fixtureChunks?: ProviderStreamChunk[]

    constructor(options?: {
        defaultDelay?: number
        scenarios?: MockScenario[]
        fixtureChunks?: ProviderStreamChunk[]
    }) {
        this.defaultDelay = options?.defaultDelay ?? 15
        this.scenarios = options?.scenarios ?? []
        this.fixtureChunks = options?.fixtureChunks
    }

    async *stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
        const lastMessage = messages[messages.length - 1]?.content || ''

        // 1. Fixture replay mode
        if (this.fixtureChunks && this.fixtureChunks.length > 0) {
            for (const chunk of this.fixtureChunks) {
                if (signal?.aborted) return
                await this.sleep(this.defaultDelay)
                yield chunk
            }
            return
        }

        // 2. Scenario match mode
        const matchedScenario = this.scenarios.find((s) =>
            s.match
                ? typeof s.match === 'string'
                    ? lastMessage.includes(s.match)
                    : s.match.test(lastMessage)
                : false
        )

        const chunksToYield = matchedScenario
            ? matchedScenario.chunks
            : this.generateDefaultProceduralChunks(lastMessage)

        const delay = matchedScenario?.chunkDelayMs ?? this.defaultDelay

        for (const chunk of chunksToYield) {
            if (signal?.aborted) return
            await this.sleep(delay)
            yield chunk
        }
    }

    private generateDefaultProceduralChunks(prompt: string): ProviderStreamChunk[] {
        return [
            { type: 'thinking_delta', text: `Analyzing user prompt: "${prompt.slice(0, 30)}..."` },
            {
                type: 'text',
                text: 'I will inspect the workspace files and make the requested changes.\n',
            },
            {
                type: 'tool_call',
                toolCall: {
                    id: `call_${Date.now()}`,
                    name: 'edit_diff',
                    input: JSON.stringify({
                        path: 'src/example.ts',
                        diff: '@@ -1,3 +1,4 @@\n-const oldVal = 1;\n+const newVal = 2;\n+console.log("Updated in mock mode");',
                    }),
                },
            },
            { type: 'text', text: '\nSuccessfully applied changes offline.' },
            { type: 'usage', promptTokens: 120, completionTokens: 45 },
        ]
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
```

---

## 4. Implementation Plan & File Structure

### 4.1 Target File Locations

```
packages/providers/
  ├── src/
  │   ├── providers/
  │   │   └── mock.ts              # MockLLMProvider implementation
  │   └── index.ts                 # Export mockProvider
packages/agent/
  ├── test/
  │   └── fixtures/
  │       └── sample-coding-session.json # Standard fixture JSON log
packages/tui/
  ├── test/
  │   ├── unit/
  │   │   └── diff-renderer.unit.test.tsx # Unit tests for git diff rendering
  │   └── integration/
  │       └── mock-stream.integration.test.tsx # Full stream replay TUI integration test
apps/cli/
  ├── src/
  │   ├── args.ts                  # Add --mock and --mock-fixture CLI options
  │   └── utils/
  │       └── provider-factory.ts  # Support provider='mock' instantiation
docs/research/
  └── tui-chat-stream-testing.md   # Research documentation
```

### 4.2 Step-by-Step Implementation Checklist

1. **Step 1: Provider Factory Update (`apps/cli/src/utils/provider-factory.ts`)**:
   Add check for `DECEMBER_MOCK=true` or `--mock` flag to return `MockLLMProvider`.
2. **Step 2: CLI Args Extension (`apps/cli/src/args.ts`)**:
   Add `--mock`, `--mock-fixture`, `--mock-delay` flags to `ParsedCliArgs`.
3. **Step 3: Fixture Recorder Utility**:
   Add option to serialize emitted `WireAgentEvent` arrays to `.json` files during agent turns.
4. **Step 4: Automated TUI Integration Test (`packages/tui/test/integration/mock-stream.integration.test.tsx`)**:
   Create a test suite using `ink-testing-library` and `MockLLMProvider` to verify that streaming text, thinking blocks, tool calls, and git diffs render cleanly without layout jitter.

---

## 5. References & Codebase Index

- **Provider Interface**: [`packages/providers/src/types.ts`](file:///home/chaitanya/code/december/packages/providers/src/types.ts#L29-L45)
- **Provider Registry**: [`packages/providers/src/registry.ts`](file:///home/chaitanya/code/december/packages/providers/src/registry.ts)
- **Agent Event Definitions**: [`packages/shared/src/types.ts`](file:///home/chaitanya/code/december/packages/shared/src/types.ts#L139-L156)
- **CLI Stream Processor**: [`apps/cli/src/hooks/use-agent-runner.ts`](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-runner.ts#L11-L183)
- **TUI Bot Message & Diff Styling**: [`packages/tui/src/components/messages/bot-message.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/messages/bot-message.tsx#L213-L314)
- **CLI Bootstrapping**: [`apps/cli/src/index.ts`](file:///home/chaitanya/code/december/apps/cli/src/index.ts#L90-L95)
