export interface McpServerConfig {
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    type?: 'stdio' | 'sse'
    disabled?: boolean
    autoApprove?: string[]
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
}
