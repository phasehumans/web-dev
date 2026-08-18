# 4. MCP Tool Namespacing Convention

Date: 2026-08-18

## Status

Accepted

## Context

When multiple MCP servers are connected concurrently, tool name collisions can occur with built-in tools (such as `bash`, `web_search`) or between different MCP servers exposing identical action names (e.g. `query`, `search`). Dynamic or inconsistent tool renaming introduces non-deterministic model behavior and breaks conversation resume continuity.

## Decision

All dynamic tools provided by MCP servers are strictly namespaced using the pattern `<server_name>__<tool_name>` (e.g., `postgres__query`, `github__create_issue`). Built-in core tools retain their canonical non-prefixed names.

## Consequences

- Completely eliminates name collisions between built-in tools and external MCP tools.
- Guarantees deterministic tool naming across session lifecycles and prompt caching.
- Simplifies TUI rendering and log formatting by making server provenance explicit in the tool name.
