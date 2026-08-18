# 5. Fault-Tolerant MCP Client Lifecycle and Discovery

Date: 2026-08-18

## Status

Accepted

## Context

MCP servers rely on external child processes (Node, Python/uvx) or remote network endpoints (SSE). If an MCP server binary is missing, network access is disrupted, or a process crashes during initialization, a strict fail-fast approach would block the agent from booting entirely, preventing users from accessing core coding tools.

## Decision

1. All enabled MCP servers are discovered and connected in parallel with a bounded initialization timeout (e.g. 5 seconds).
2. Failed server connections do not abort agent boot. The system logs a warning, flags the server as `failed` in the `/mcp` manager, and proceeds with built-in tools and healthy MCP servers.
3. Connected client transports are retained in a persistent connection pool for the session lifetime and cleanly terminated on session close.

## Consequences

- High session resilience and fast agent startup.
- Unhealthy servers are visibly surfaced in the TUI without crashing the core agent loop.
- Dynamic tool registration gracefully adapts to available servers.
