# Primary-Source Research: Model Context Protocol (MCP) Architecture, TUI Configuration & Presets

## Executive Summary

Model Context Protocol (MCP) is an open standard enabling AI coding agents to dynamically access specialized tools, databases, resources, and external APIs.

In December CLI's existing codebase:

1. **Dynamic Tool Architecture (ADR 0002 & 0004)**: Dynamic first-class MCP tool registration is architected via [`McpClientPool`](file:///home/chaitanya/code/december/packages/tools/src/mcp/pool.ts#L24-L271) using the `<server>__<tool>` namespace pattern, superseding the legacy single meta-tool wrapper.
2. **Current State & Gaps**: While the parallel connection pool, fault-tolerant startup timeouts (ADR 0005), and basic TUI manager list exist, key production capabilities are missing or have critical bugs:
    - **Zombie Tools on Reload**: Disabling or removing an MCP server in `.december/mcp.json` leaves orphaned tool definitions inside `Agent.tools` in [`use-agent-session.ts`](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-session.ts#L1373-L1411).
    - **Environment Variable Wipe in Stdio**: In [`pool.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/pool.ts#L209-L216), `env: serverConfig.env` is passed directly to `StdioClientTransport`, stripping system `PATH` and causing child process execution failures (`ENOENT` for `npx`/`uvx`).
    - **Legacy Meta-Tool Residue**: [`MCPTool`](file:///home/chaitanya/code/december/packages/tools/src/mcp.ts#L11-L63) is still registered in [`apps/cli/src/index.ts`](file:///home/chaitanya/code/december/apps/cli/src/index.ts#L142).
    - **Limited Configuration Discovery**: [`config.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/config.ts#L73-L113) only loads from `.december/mcp.json` and `~/.config/december/mcp.json`, omitting `~/.december/mcp.json`, Claude Desktop, Claude Code, and Cursor configs.
    - **TUI Management Limitations**: [`McpManagerMenu`](file:///home/chaitanya/code/december/packages/tui/src/components/menus/mcp-manager-menu.tsx) is read-only (except disable toggle); it lacks 1-click preset installation, server creation/deletion wizards, environment variable configuration, live connection diagnostics, and stderr log inspection.

This research document outlines the primary-source audit, official protocol alignment, and an end-to-end implementation blueprint to make MCP in December simple, robust, and delightful to use.

---

## 1. Codebase Audit & Primary Source Analysis

### 1.1 Architectural Decisions (ADRs)

- **[`docs/adr/0002-native-dynamic-mcp-tools.md`](file:///home/chaitanya/code/december/docs/adr/0002-native-dynamic-mcp-tools.md#L1-L22)**: Mandates discovering MCP tools via `tools/list` at startup and registering them directly as first-class native tools with individual parameter schemas, replacing the generic meta-tool wrapper.
- **[`docs/adr/0003-in-sandbox-mcp-execution.md`](file:///home/chaitanya/code/december/docs/adr/0003-in-sandbox-mcp-execution.md#L1-L22)**: Mandates running stdio-based MCP servers inside E2B / microVM sandboxes via [`SandboxStdioTransport`](file:///home/chaitanya/code/december/packages/tools/src/mcp/transports/sandbox-stdio.ts) rather than on cloud worker hosts.
- **[`docs/adr/0004-mcp-tool-namespacing.md`](file:///home/chaitanya/code/december/docs/adr/0004-mcp-tool-namespacing.md#L1-L22)**: Mandates strict namespacing format `<server_name>__<tool_name>` (e.g. `postgres__query`, `github__create_issue`) to prevent name collisions with core tools (`bash`, `grep_search`).
- **[`docs/adr/0005-fault-tolerant-mcp-lifecycle.md`](file:///home/chaitanya/code/december/docs/adr/0005-fault-tolerant-mcp-lifecycle.md#L1-L24)**: Mandates parallel server discovery with a 5000ms bounded timeout, ensuring failed MCP servers do not crash or block agent startup.

---

### 1.2 Package Implementation Details

#### `packages/tools`

- **[`packages/tools/src/mcp.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp.ts#L11-L63)**: Exports the legacy `MCPTool` meta-wrapper.
    - _Critical Issue_: Each execution spawns a new `Client` and `StdioClientTransport` without calling `close()`, leaking child processes.
- **[`packages/tools/src/mcp/types.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/types.ts#L1-L30)**: Defines `McpServerConfig`, `McpConfigFile`, `McpServerStatus`, and `McpServerInfo`.
    - _Missing Attributes_: `headers?: Record<string, string>` (for SSE/HTTP auth), `cwd?: string`, `timeout?: number`, `catalogId?: string`.
- **[`packages/tools/src/mcp/config.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/config.ts#L7-L133)**: Implements `${VAR:-default}` env interpolation, config merging, and file I/O.
    - _Gap_: Omits `~/.december/mcp.json` and external formats (Claude Desktop `claude_desktop_config.json`, Cursor `.cursor/mcp.json`).
- **[`packages/tools/src/mcp/pool.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/pool.ts#L24-L271)**: Implements `McpClientPool` using `@modelcontextprotocol/sdk` (`Client`, `StdioClientTransport`, `SSEClientTransport`).
    - _Critical Defect (Line 214)_: Direct assignment `env: serverConfig.env` in `StdioClientTransport` wipes out `process.env.PATH`, breaking `npx`/`uvx`. Needs `{ ...process.env, ...serverConfig.env }`.
- **[`packages/tools/src/mcp/transports/sandbox-stdio.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/transports/sandbox-stdio.ts#L11-L107)**: Implements custom `Transport` bridging stdio over sandbox bash operations.

#### `packages/agent`

- **[`packages/agent/src/agent.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent.ts#L56-L134)**: Maintains `tools: Map<string, Tool>` with `registerTool` and `unregisterTool`. Lacks bulk synchronization (`syncMcpTools`).
- **[`packages/agent/src/harness/agent-harness.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts#L86-L115)**: Instantiates and initializes `McpClientPool` on startup.
- **[`packages/agent/src/agent-loop.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent-loop.ts#L350-L360)**: Pre-processes tools through [`trimToolSchema`](file:///home/chaitanya/code/december/packages/agent/src/utils/schema-trimmer.ts) to strip markdown formatting and metadata for token efficiency.

#### `packages/tui` & `apps/cli`

- **[`apps/cli/src/index.ts`](file:///home/chaitanya/code/december/apps/cli/src/index.ts#L142-L185)**: Registers `MCPTool` legacy wrapper (line 142) and launches non-blocking MCP initialization (lines 172, 185).
- **[`apps/cli/src/hooks/use-agent-session.ts`](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-session.ts#L1373-L1411)**: Implements `/mcp` toggle and reload handlers.
    - _Critical Bug_: Does not remove disabled or removed tools from `agent.tools`, leaving zombie tools registered with dead client references.
- **[`packages/tui/src/components/menus/mcp-manager-menu.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/menus/mcp-manager-menu.tsx#L1-L173)**: Renders list of servers, statuses (`[connected]`, `[failed]`, `[disabled]`), error messages, and tool lists. Lacks interactive server creation, catalog browsing, or connection testing.
- **[`packages/shared/src/utils/token-decomposition.ts`](file:///home/chaitanya/code/december/packages/shared/src/utils/token-decomposition.ts#L138-L220)**: Automatically decomposes and tracks token usage for dynamic MCP tools for context auditing and KV caching.

---

## 2. Gap Analysis Matrix

```mermaid
graph LR
    subgraph Config Discovery
        W1[".december/mcp.json"] --> CM[Config Merger]
        G1["~/.config/december/mcp.json"] --> CM
        G2["~/.december/mcp.json"] -. Missing .-> CM
        EXT["Claude / Cursor mcp.json"] -. Missing .-> CM
    end

    subgraph Runtime Pool
        CM --> POOL[McpClientPool]
        POOL -->|Merge env PATH| STDIO[Local Stdio Child]
        POOL -->|Add Auth Headers| SSE[Remote SSE / HTTP]
        POOL -->|Non-blocking exec| SB[Sandbox Stdio]
    end

    subgraph Agent Sync
        POOL -->|syncMcpTools| AG[Agent Tool Map]
        AG -->|No Zombie Tools| LLM[LLM Context Window]
    end
```

| Component                          | Current State                                                           | Target Production Architecture                                                                         | Priority  |
| :--------------------------------- | :---------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------- |
| **Child Process Environment**      | Strips `process.env` when `serverConfig.env` is supplied.               | Merge `{ ...process.env, ...serverConfig.env }` to preserve `PATH` and system runtimes.                | 🔴 High   |
| **Tool Synchronization**           | `Agent.tools` retains dead tools when server is disabled/removed.       | Implement `Agent.syncMcpTools(tools)` to prune old `<server>__*` tools before registering new ones.    | 🔴 High   |
| **Legacy Meta-Tool**               | `MCPTool` in `packages/tools/src/mcp.ts` & `apps/cli/src/index.ts`.     | Deprecate and remove static meta-tool; use native tools exclusively.                                   | 🟡 Medium |
| **Multi-Source Config Resolution** | Only loads from `.december/mcp.json` and `~/.config/december/mcp.json`. | Unified config loader supporting `~/.december/mcp.json`, Claude Desktop, Claude Code, and Cursor.      | 🟡 Medium |
| **Remote Transport Auth**          | `SSEClientTransport` without custom headers.                            | Support `headers?: Record<string, string>` for Bearer tokens and remote endpoints.                     | 🟡 Medium |
| **TUI MCP Experience**             | Read-only list with disable toggle only.                                | Full Manager with 1-click Preset Catalog, Add/Delete wizard, Connection Tester, and Stderr log viewer. | 🟡 Medium |

---

## 3. Built-In Preset Catalog Specification

To make MCP zero-configuration and easy to use, December should provide a built-in catalog of curated MCP servers installable in 1 click from the TUI:

```ts
export interface McpCatalogPreset {
    id: string
    name: string
    category: 'Development' | 'Database' | 'Search & Web' | 'Productivity' | 'System'
    description: string
    config: McpServerConfig
    envPrompts?: Array<{
        key: string
        label: string
        placeholder?: string
        secret: boolean
        required: boolean
        defaultValue?: string
    }>
}

export const MCP_CATALOG: McpCatalogPreset[] = [
    {
        id: 'github',
        name: 'GitHub',
        category: 'Development',
        description: 'Search repositories, manage issues, read pull requests and commits',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
            autoApprove: ['get_issue', 'list_issues', 'search_repositories', 'get_file_contents'],
        },
        envPrompts: [
            {
                key: 'GITHUB_TOKEN',
                label: 'GitHub Personal Access Token',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        category: 'Database',
        description: 'Read-only queries, table inspections, and schema exploration',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres', '${POSTGRES_URL}'],
            autoApprove: ['describe_table', 'list_tables'],
        },
        envPrompts: [
            {
                key: 'POSTGRES_URL',
                label: 'Postgres Connection URI',
                placeholder: 'postgresql://user:pass@localhost:5432/db',
                secret: true,
                required: true,
            },
        ],
    },
    {
        id: 'sqlite',
        name: 'SQLite',
        category: 'Database',
        description: 'Query and explore local SQLite database files',
        config: {
            command: 'uvx',
            args: ['mcp-server-sqlite', '--db-path', '${DB_PATH:-./dev.db}'],
            autoApprove: ['read_query', 'describe_table', 'list_tables'],
        },
        envPrompts: [
            {
                key: 'DB_PATH',
                label: 'Path to SQLite database',
                defaultValue: './dev.db',
                secret: false,
                required: true,
            },
        ],
    },
    {
        id: 'brave-search',
        name: 'Brave Search',
        category: 'Search & Web',
        description: 'High-quality web search and local POI lookups',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: { BRAVE_API_KEY: '${BRAVE_API_KEY}' },
            autoApprove: ['brave_web_search'],
        },
        envPrompts: [
            { key: 'BRAVE_API_KEY', label: 'Brave Search API Key', secret: true, required: true },
        ],
    },
    {
        id: 'fetch',
        name: 'Fetch (Web Content)',
        category: 'Search & Web',
        description: 'Fetch web pages and convert HTML to clean markdown for LLM consumption',
        config: {
            command: 'uvx',
            args: ['mcp-server-fetch'],
            autoApprove: ['fetch'],
        },
    },
    {
        id: 'puppeteer',
        name: 'Puppeteer Browser',
        category: 'Search & Web',
        description: 'Browser automation, screenshot rendering, and JavaScript execution',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-puppeteer'],
        },
    },
    {
        id: 'memory',
        name: 'Knowledge Graph Memory',
        category: 'Productivity',
        description: 'Persistent graph memory and entity relations across conversations',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            autoApprove: ['read_graph', 'search_nodes'],
        },
    },
    {
        id: 'filesystem',
        name: 'Secure Filesystem Access',
        category: 'System',
        description: 'Read and search specific allowed filesystem directories',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '${ALLOWED_DIR:-.}'],
            autoApprove: ['list_directory', 'read_file'],
        },
        envPrompts: [
            {
                key: 'ALLOWED_DIR',
                label: 'Allowed Root Directory',
                defaultValue: '.',
                secret: false,
                required: true,
            },
        ],
    },
]
```

---

## 4. TUI Management Experience Design

### Interactive Screens

1. **Main MCP Manager (`/mcp` / `mcp_manager`)**:
    - Displays all active servers with rich status indicators: `● Connected` (green), `▲ Failed` (red), `○ Disabled` (dim).
    - Shows server command, transport type, masked environment variables (`GITHUB_TOKEN=ghp_****`), auto-approved tool count, and active tools.
    - Keybindings:
        - `d` / `space`: Toggle Enable/Disable
        - `a`: Open Preset Catalog / Add Custom Server
        - `x` / `backspace`: Remove Server from config
        - `t`: Test Server connection & latency
        - `l`: View Server logs / stderr output
        - `r`: Reload all servers
        - `esc`: Return to chat

2. **Preset Catalog Modal (`mcp_catalog`)**:
    - Grouped navigation by categories (`Development`, `Database`, `Search & Web`, `Productivity`, `System`).
    - Selecting a preset automatically steps through required environment prompts with password masking.
    - Automatically persists to `.december/mcp.json` (workspace) or `~/.config/december/mcp.json` (global) and connects immediately without restarting the CLI session.

3. **Custom Server Wizard (`mcp_custom_wizard`)**:
    - Prompts for Server Name, Transport (`stdio` or `sse`), Command/Args or URL, and Environment Key-Value pairs.

---

## 5. Implementation Roadmap

### Phase 1: Core Engine & Lifecycle Hardening (`packages/tools` & `packages/agent`)

- [ ] In [`packages/tools/src/mcp/pool.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/pool.ts): Merge `process.env` into stdio spawn options: `env: { ...process.env, ...(serverConfig.env || {}) }`.
- [ ] Add `headers?: Record<string, string>` support to `McpServerConfig` in [`packages/tools/src/mcp/types.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/types.ts).
- [ ] Implement `Agent.syncMcpTools(tools: Tool[])` in [`packages/agent/src/agent.ts`](file:///home/chaitanya/code/december/packages/agent/src/agent.ts) to clean up orphaned `<server>__*` tools on reload.
- [ ] Implement `AgentHarness.reloadMCP()` in [`packages/agent/src/harness/agent-harness.ts`](file:///home/chaitanya/code/december/packages/agent/src/harness/agent-harness.ts).
- [ ] Remove deprecated `MCPTool` registration from [`apps/cli/src/index.ts`](file:///home/chaitanya/code/december/apps/cli/src/index.ts).

### Phase 2: Configuration Loader & Presets (`packages/tools`)

- [ ] Create [`packages/tools/src/mcp/catalog.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/catalog.ts) exporting `MCP_CATALOG`.
- [ ] Expand [`packages/tools/src/mcp/config.ts`](file:///home/chaitanya/code/december/packages/tools/src/mcp/config.ts) to detect `~/.december/mcp.json`, Claude Desktop, Claude Code, and Cursor configs.

### Phase 3: TUI MCP Manager Overhaul (`packages/tui` & `apps/cli`)

- [ ] Upgrade [`packages/tui/src/components/menus/mcp-manager-menu.tsx`](file:///home/chaitanya/code/december/packages/tui/src/components/menus/mcp-manager-menu.tsx) with Catalog browser, Add/Remove actions, masked env displays, and connection testing.
- [ ] Update MCP toggle and reload handlers in [`apps/cli/src/hooks/use-agent-session.ts`](file:///home/chaitanya/code/december/apps/cli/src/hooks/use-agent-session.ts) to call `harness.reloadMCP()`.

### Phase 4: Verification & Integration Testing

- [ ] Add unit tests for multi-source config resolution in `packages/tools/test/unit/mcp-config.unit.test.ts`.
- [ ] Add unit tests for `Agent.syncMcpTools()` in `packages/agent/test/unit/harness.unit.test.ts`.
- [ ] Verify dynamic catalog installation in `packages/tui/test/unit/mcp-manager-menu.unit.test.tsx`.
