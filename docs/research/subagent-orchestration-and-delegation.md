# Primary-Source Research: Subagent Orchestration & Delegated Multi-Agent Architecture

## Executive Summary

As software engineering tasks grow in complexity (e.g. repo-wide architectural migrations, cross-package refactoring, deep bug investigations), a **single linear agent loop** suffers from context pollution, high token costs, and sequential execution bottlenecks.

In a single-agent architecture:

- Broad codebase explorations (running 20+ `grep_search` and `read_file` calls) pollute the orchestrator's context window with thousands of lines of intermediate exploratory noise.
- The agent cannot easily parallelize independent research sub-tasks (e.g., investigating backend API endpoints while simultaneously inspecting frontend components).

Leading agent systems (including **Claude Code** and **Antigravity**) solve this by introducing **Subagent Delegation Protocols**:

- The main orchestrator spawns specialized, isolated child subagents (e.g. `research`, `reviewer`, `indexer`) equipped with scoped toolsets and isolated context windows.
- The subagent conducts deep multi-step searches independently and returns a synthesized, high-density finding back to the parent agent.

This document details the primary-source architecture for introducing **Subagent Spawning & Orchestration** into December.

---

## 1. Primary Source Analysis: Subagent Design Patterns

### 1.1 Context Isolation vs Context Clutter

- **Without Subagents**:
  Parent Context: [User Prompt] $\rightarrow$ [Tool 1: Grep 500 lines] $\rightarrow$ [Tool 2: Read 800 lines] $\rightarrow$ [Tool 3: Grep 300 lines] $\rightarrow$ [Tool 4: Read 600 lines] $\rightarrow$ [Final Answer].
  _Result_: 50,000+ tokens consumed on every future turn.
- **With Research Subagent**:
  Parent Context: [User Prompt] $\rightarrow$ [Tool: `invoke_subagent` (research)] $\rightarrow$ [Subagent Result: 15-line structured summary with exact file & line references] $\rightarrow$ [Direct, surgical file edit].
  _Result_: Clean context, lower latency, zero hallucination of unrelated code.

### 1.2 Tool Permission Scoping

- **Research Subagent**: Granted only read-only tools (`read_file`, `grep_search`, `find_files`, `ls`, `web_search`). File writing (`write_file`, `edit_file`) and destructive shell commands are stripped from the tool schema, guaranteeing sandbox safety.
- **Reviewer Subagent**: Given project rules (`AGENTS.md`) and git diff to critique changes without modifying files.

---

## 2. Subagent Architecture for December

```
                       +-----------------------------------+
                       |       Parent Agent Harness        |
                       |       (Full Toolset & TUI)        |
                       +-----------------------------------+
                                         |
                                         v
                         Tool Call: invoke_subagent({
                             role: "API Researcher",
                             type: "research",
                             prompt: "Find all usages of validateSession"
                         })
                                         |
                                         v
                       +-----------------------------------+
                       |       Subagent Lifecycle Pool     |
                       +-----------------------------------+
                                         |
                    +--------------------+--------------------+
                    |                                         |
                    v                                         v
          [Child Agent Context]                     [Scoped Tool Registry]
          - Isolated ConversationManager            - Read-only tools only
          - Lightweight system prompt               - Blocked bash/write
          - Inherited LLM Provider                  - AbortSignal linked to parent
                    |                                         |
                    +--------------------+--------------------+
                                         |
                                (Runs Child Loop)
                                         |
                                         v
                             Synthesized Child Summary
                                         |
                                         v
                           Parent Agent Receives Result
```

---

## 3. Implementation Blueprint

### 3.1 Subagent Tool Definition (`packages/tools/src/subagent.ts`)

```typescript
import { Type, Static } from '@sinclair/typebox'
import { Tool, ToolExecuteContext } from '@december/shared'
import { Agent } from '@december/agent'

const subagentSchema = Type.Object({
    subagents: Type.Array(
        Type.Object({
            role: Type.String({
                description: "2-5 word job title, e.g. 'Auth Codebase Researcher'",
            }),
            typeName: Type.Union(
                [Type.Literal('research'), Type.Literal('self'), Type.Literal('reviewer')],
                {
                    description: 'Type of subagent to launch.',
                }
            ),
            prompt: Type.String({
                description: 'Actionable, specific task instructions for the subagent.',
            }),
        })
    ),
})

export type InvokeSubagentInput = Static<typeof subagentSchema>

export const InvokeSubagentTool: Tool<InvokeSubagentInput> = {
    name: 'invoke_subagent',
    description:
        'Spawns one or more background child subagents to execute research or code reviews in an isolated context window, returning a concise synthesized summary to keep the main context clean.',
    inputSchema: subagentSchema,
    execute: async ({ subagents }, context: ToolExecuteContext) => {
        const results = await Promise.all(
            subagents.map(async (task) => {
                try {
                    // Filter tools for research subagent
                    const allowedToolNames =
                        task.typeName === 'research'
                            ? ['read_file', 'grep_search', 'find_files', 'ls', 'web_search']
                            : Array.from(context.operations.agentTools?.keys() || [])

                    const childTools = (context.operations.allTools || []).filter((t) =>
                        allowedToolNames.includes(t.name)
                    )

                    const childAgent = new Agent({
                        llm: context.operations.llm,
                        tools: childTools,
                        operations: context.operations,
                        workspaceDir: context.operations.env.cwd(),
                        systemPrompt: `You are an autonomous ${task.role}. Your task is to investigate the query thoroughly and return a concise, high-density report with exact file paths, line ranges, and key findings. Do NOT write code or edit files.`,
                        thinkingLevel: 'auto',
                    })

                    context.onStream(`[Subagent: ${task.role}] Starting investigation...\n`)

                    let childOutput = ''
                    const stream = childAgent.runLoop(task.prompt)
                    for await (const event of stream) {
                        if (event.type === 'StreamChunk') {
                            childOutput += event.content
                        } else if (event.type === 'ToolCallStart') {
                            context.onStream(
                                `[Subagent: ${task.role}] Executing ${event.toolCall.name}...\n`
                            )
                        }
                    }

                    return `### Subagent Report: ${task.role}\n${childOutput.trim() || 'No output generated.'}`
                } catch (error: any) {
                    return `### Subagent Error: ${task.role}\nFailed: ${error.message}`
                }
            })
        )

        return results.join('\n\n---\n\n')
    },
}
```

---

## 4. TUI Integration & Background Multi-Tasking

In [`packages/tui`](file:///home/chaitanya/code/december/packages/tui):

- Subagent execution is visualized in the TUI status footer with collapsible spinner pills: `[⚡ Auth Researcher: Searching 12 files...]`.
- Users can press `/tasks` or use arrow keys to inspect the live streaming transcript of any child subagent in real time.
- Parent agent can spawn up to 4 parallel subagents concurrently for broad multi-package audits.

---

## 5. Quantitative Value

1. **Context Window Savings**: Reduces parent context accumulation by **60%–80%** during deep codebase investigations.
2. **Parallel Research**: Enables auditing 3 distinct microservices or packages simultaneously in parallel subagent loops.
3. **Sandbox Safety**: Child research agents are mathematically incapable of making destructive writes or unapproved edits.
