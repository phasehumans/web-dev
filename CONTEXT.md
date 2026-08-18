# December Domain Model

Autonomous coding agent platform operating seamlessly across local terminal environments and remote cloud sandboxes.

## Language

**MCP Server**:
An external process or service implementing the Model Context Protocol that exposes custom tools, prompts, or resources to the agent.
_Avoid_: Plugin server, external tool provider, agent add-on

**Native Dynamic Tool**:
A tool discovered dynamically at session initialization from an MCP Server and registered directly in the agent's tool catalog alongside built-in tools.
_Avoid_: Meta-tool, MCP wrapper tool, gateway tool

**Workspace MCP Config**:
The repository-scoped MCP server definition file located at `.december/mcp.json` that defines project-specific MCP servers.
_Avoid_: Project MCP settings, local MCP file

**Global MCP Config**:
The user-scoped MCP server definition file located at `~/.config/december/mcp.json` shared across all repositories on the user's machine.
_Avoid_: User MCP settings, system MCP file

**Sandbox Stdio Transport**:
An MCP transport implementation that spawns and bridges standard input/output for an MCP Server running inside an isolated cloud sandbox microVM.
_Avoid_: Host process transport, remote CLI wrapper

**MCP Manager**:
The interactive CLI TUI interface and command system (accessible via `/mcp` and `/settings`) for inspecting, testing, and managing configured MCP servers and their exposed tools.
_Avoid_: MCP dashboard, tool settings panel

**Tool Permission Policy**:
The governance rules determining whether built-in and dynamic MCP tools execute automatically or require interactive user approval.
_Avoid_: Approval mode, confirmation toggle

**Persistent MCP Client Pool**:
The active collection of connected MCP client transports maintained across the session lifecycle for fast, non-blocking tool executions and clean process teardown.
_Avoid_: MCP connection cache, client dictionary
