# 3. In-Sandbox Execution for Cloud MCP Stdio Transports

Date: 2026-08-18

## Status

Deprecated (Retired in favor of core platform tools and zero-overhead cloud workers)

## Context

In Cloud and E2B sandbox environments, agents interact with repositories loaded inside isolated microVMs (`/workspace`). Previously, an attempt was made to run stdio-based MCP servers inside cloud microVMs via `SandboxStdioTransport`.

## Deprecation Rationale

1. **MicroVM Startup Overhead**: Dynamic tool resolution and package installations (`npx`, `uvx`) inside ephemeral sandboxes significantly slowed sandbox initialization and agent latency.
2. **Local vs Cloud Network Mismatch**: Cloud sandboxes cannot reach developers' local network resources (e.g. `localhost:5432` PostgreSQL, local Docker daemons).
3. **Core Tool Sufficiency**: December Cloud leverages built-in core platform tools (`bash`, `read_file`, `write_file`, `edit_diff`, `grep_search`, etc.) without requiring external MCP processes.
4. **Local CLI Focus**: MCP execution is retained exclusively in the local terminal CLI where it directly accesses developer machine runtimes and services.

## Consequences

- Removed `SandboxStdioTransport` from `@december/tools`.
- Cloud runtime skips MCP initialization (`skipMcp: true`).
- MCP is maintained cleanly in `@trydecember/cli` for local terminal workflows.
