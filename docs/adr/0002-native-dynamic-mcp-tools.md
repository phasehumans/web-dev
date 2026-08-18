# 2. Native Dynamic MCP Tool Registration

Date: 2026-08-18

## Status

Accepted

## Context

December previously had a static meta-tool (`MCPTool`) that delegated calls via a generic `{ server, tool, args }` payload. This required the model to perform multi-hop discovery or rely on prompt injections, resulting in higher token overhead and lower tool-calling reliability.

## Decision

MCP servers configured for the workspace or user are connected during session initialization. Their exposed tools are fetched via `tools/list` and mounted directly into the agent's active tool registry as first-class native tools, allowing the LLM to inspect individual parameter schemas and descriptions natively.

## Consequences

- Direct, typed tool definitions exposed to the LLM provider.
- Unified streaming, permission checks, and TUI command rendering across built-in and MCP tools.
- Replaces the generic meta-tool wrapper approach in `packages/tools`.
