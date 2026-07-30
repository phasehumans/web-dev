# CLI Performance & TUI Streaming Research

This document outlines the findings of our research into the CLI performance, TUI streaming delays, artificial timeouts, and chain-of-thought rendering in the December codebase.

---

## 1. Execution Delays & Model Stuck in Working Loader

### A. Hardcoded 3-Second Delay for Local Tool Execution

When executing local commands in the CLI (e.g. bash commands), the execution path relies on `executeLocalBashCommand`. There is a hardcoded `setTimeout` of **3 seconds** (3000ms) before the operation decides whether a process should be treated as a background task.

- **Location:** [apps/cli/src/local-operations.ts](file:///home/chaitanya/code/december/apps/cli/src/local-operations.ts#L49-L55)
- **Impact:** Every command execution incurs a minimum 3-second block on tool resolution before returning control to the agent, creating a noticeable delay during interactive CLI usage.

### B. Exponential Retry Backoff on Rate Limits / Capacity Constraints

When model providers return transient errors such as `503 Service Unavailable`, `529 Overloaded`, or `429 Rate Limit Exceeded`, the agent execution loop uses `pRetry` with exponential backoff.

- **Location:** [packages/agent/src/agent-loop.ts](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L349-L356)
- **Impact:** During these retry attempts, an `AgentStatus` update is emitted, leaving the TUI interface stuck in the "Working..." loader spinner until the API call succeeds or max attempts are reached.

---

## 2. Streaming Delays & Laggy Chat Stream

### A. Artificial Typing Effect in `SmoothMarkdown`

The TUI uses a `SmoothMarkdown` component intended to smooth out LLM output streaming. However, it implements an artificial typing effect using `setInterval` set to 20ms and reveals text at 1–3 characters per tick.

- **Location:** [packages/tui/src/components/messages/smooth-markdown.tsx](file:///home/chaitanya/code/december/packages/tui/src/components/messages/smooth-markdown.tsx#L21-L31)
- **Impact:** Even when chunks arrive rapidly from the LLM provider, the TUI artificially chokes and throttles the output rendering rate, causing visual lag and text buffering.

### B. React State Debounce in `useAgentRunner`

In the CLI app, incoming stream events from the agent runner are buffered with a 50ms `setTimeout` debounce before updating React state (`setActiveMessages`).

- **Location:** [apps/cli/src/hooks/use-agent-runner.ts](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-runner.ts#L170-L175)
- **Impact:** State updates to Ink (React for CLI) are delayed in 50ms batches, contributing to choppy and delayed UI updates during fast token generation.

---

## 3. Chain of Thought (Reasoning) in Chat TUI

### A. Why Chain-of-Thought is Generated

1. **Prompt Instruction:** The agent harness system prompt explicitly instructs models to emit XML `<thought>` tags prior to executing tools.
    - **Location:** [packages/agent/src/harness/agent-harness.ts](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts#L35)
2. **Provider Native Reasoning:** Providers (such as Anthropic Claude 3.7 / 3.5 Sonnet with extended thinking enabled) emit native `thinking_delta` events during generation.
    - **Location:** [packages/providers/src/providers/anthropic.ts](file:///home/chaitanya/code/december/packages/providers/src/providers/anthropic.ts#L130-L131) and [packages/agent/src/agent-loop.ts](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L292-L293)

### B. How Chain-of-Thought is Processed & Rendered

- **Thinking Chunks:** Emitted `ThinkingChunk` events are processed by `useAgentRunner` into `thinking` blocks within the active message state ([apps/cli/src/hooks/use-agent-runner.ts](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-runner.ts#L103-L118)).
- **Regex Parsing in `BotMessage`:** `BotMessage` parses `<thought>` tags out of standard text streams using regex `/(<thought(?:>| [^>]*>)[\s\S]*?<\/thought>|<thought(?:>| [^>]*>)[\s\S]*)/i`.
- **CollapsibleThought Component:** Both parsed `<thought>` tags and native thinking blocks are passed to `CollapsibleThought`.
    - **Location:** [packages/tui/src/components/messages/bot-message.tsx](file:///home/chaitanya/code/december/packages/tui/src/components/messages/bot-message.tsx#L126-L144)

### C. Options to Suppress / Disable Chain-of-Thought

- **Frontend Suppression (Hide in TUI):** Update `bot-message.tsx` to return `null` when encountering `thinking` blocks or `<thought>` tags instead of rendering `CollapsibleThought`.
- **Backend Suppression (Disable Reasoning):**
    - Remove `<thought>` directives from system prompts in `agent-harness.ts`.
    - Pass `thinkingLevel: 'off'` (or budget 0) in provider configurations to prevent models from generating native thinking tokens.

---

## 4. Summary & Recommendations

| Issue                   | Root Cause                                                           | File Location                                                                                                                | Recommended Fix                                                       |
| :---------------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Execution Delay**     | Hardcoded 3000ms delay in local command execution                    | [local-operations.ts](file:///home/chaitanya/code/december/apps/cli/src/local-operations.ts#L49-L55)                         | Reduce or eliminate non-blocking process wait threshold               |
| **Streaming Lag**       | 20ms `setInterval` character-by-character typing in `SmoothMarkdown` | [smooth-markdown.tsx](file:///home/chaitanya/code/december/packages/tui/src/components/messages/smooth-markdown.tsx#L21-L31) | Bypass artificial typing delay and render stream chunks directly      |
| **UI State Latency**    | 50ms debounce batching on stream updates in CLI                      | [use-agent-runner.ts](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-runner.ts#L170-L175)                 | Optimize state update frequency or flush immediately for small chunks |
| **Chain-of-Thought UI** | `CollapsibleThought` rendered in `bot-message.tsx`                   | [bot-message.tsx](file:///home/chaitanya/code/december/packages/tui/src/components/messages/bot-message.tsx#L126-L144)       | Add configuration toggle to filter out or hide reasoning blocks       |
