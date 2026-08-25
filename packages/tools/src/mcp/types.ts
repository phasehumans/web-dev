export interface McpServerConfig {
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    type?: 'stdio' | 'sse' | 'http'
    headers?: Record<string, string>
    cwd?: string
    timeout?: number
    disabled?: boolean
    autoApprove?: string[]
    description?: string
    catalogId?: string
}

export interface McpConfigFile {
    mcpServers: Record<string, McpServerConfig>
}

export type McpServerStatus = 'connected' | 'failed' | 'disabled'

export interface McpDiscoveredTool {
    name: string
    description?: string
    inputSchema?: any
}

export interface McpServerInfo {
    name: string
    status: McpServerStatus
    config: McpServerConfig
    error?: string
    tools?: McpDiscoveredTool[]
    latencyMs?: number
}

export interface McpCatalogEnvPrompt {
    key: string
    label: string
    placeholder?: string
    secret?: boolean
    required?: boolean
    defaultValue?: string
}

export interface McpCatalogPreset {
    id: string
    name: string
    category: 'Development' | 'Database' | 'Search & Web' | 'Productivity' | 'System' | string
    description: string
    config: McpServerConfig
    envPrompts?: McpCatalogEnvPrompt[]
}
