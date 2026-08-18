# 3. In-Sandbox Execution for Cloud MCP Stdio Transports

Date: 2026-08-18

## Status

Accepted

## Context

In Cloud and E2B sandbox environments, agents interact with repositories loaded inside isolated microVMs (`/workspace`). MCP servers using standard I/O (`stdio`) often require access to workspace files, project runtimes (e.g. Node, Python, SQLite), or internal sandbox network services.

## Decision

Stdio-based MCP servers configured in cloud sessions are executed directly inside the E2B microVM sandbox via a dedicated `SandboxStdioTransport` rather than on the cloud worker host. Remote `sse` and `http` MCP servers continue to connect over the network.

## Consequences

- Full workspace file and environment access for stdio MCP tools.
- Strict security isolation between cloud tenants, preventing host worker process contamination.
- Requires sandbox process streaming management and lifecycle cleanup upon session termination.
