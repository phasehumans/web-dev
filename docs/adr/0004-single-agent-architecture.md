# 4. Single-Agent Architecture & Subagent Deprecation

Date: 2026-07-26

## Status

Accepted

## Context

The CLI and agent runtime previously included a read-only subagent spawning mechanism (`invoke_subagent` and `spawnSubagent`). This feature introduced secondary agent loops, nested context management, subagent depth tracking, and complex TUI status state. In practice, delegating basic read/search operations to subagents added execution latency, increased API token overhead, and made tool dispatch harder to trace for developers who expect a lean, fast, single-agent CLI experience similar to `pi`.

## Decision

1. **Remove Subagent Tool & Spawner Context**:
    - Deprecate and completely remove `SubagentTool` (`invoke_subagent`) from `@december/tools`.
    - Remove `spawnSubagent` from `ToolExecuteContext` in `@december/shared`.
    - Remove subagent sub-loop execution logic and `subagent-` session depth validation from `runAgentLoop` and `executeSingleTool` in `@december/agent`.

2. **Streamline CLI Toolset & TUI Formatting**:
    - Remove `SubagentTool` from default CLI harness registrations in `apps/cli/src/index.ts`.
    - Remove subagent summary formatting cases in `apps/cli/src/utils/formatters.ts` and associated unit tests.
    - Remove `activeSubagent` status state and subagent banner overrides in `@december/tui`.

3. **Single-Agent Model**:
    - All environment exploration, file editing, and command execution tasks are performed directly by the primary agent loop.

## Consequences

- Simpler mental model for agent execution loops with lower token overhead and reduced execution latency.
- Cleaner tool context interface across packages.
- CLI user interface remains fast, predictable, and focused on core primary tool feedback.
