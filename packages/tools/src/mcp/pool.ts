import { interpolateServerConfig, loadMcpConfig } from './config'
import { SandboxStdioTransport } from './transports/sandbox-stdio'

import type { McpConfigFile, McpServerConfig, McpServerInfo } from './types'
import type { Tool, ToolExecuteContext } from '@december/shared'

export interface McpClientPoolOptions {
    workspaceDir?: string
    globalConfigDir?: string
    env?: Record<string, string | undefined>
    operations?: any
    connectionTimeoutMs?: number
    clientFactory?: (serverName: string, serverConfig: McpServerConfig) => any
    transportFactory?: (serverName: string, serverConfig: McpServerConfig) => any
}

interface ActiveMcpClient {
    name: string
    config: McpServerConfig
    client: any
    transport?: any
}

export class McpClientPool {
    private options: McpClientPoolOptions
    private activeClients: Map<string, ActiveMcpClient> = new Map()
    private serverInfos: McpServerInfo[] = []
    private tools: Tool[] = []
    private currentConfig?: McpConfigFile

    constructor(options: McpClientPoolOptions = {}) {
        this.options = options
    }

    public async initialize(config?: McpConfigFile): Promise<McpServerInfo[]> {
        if (!config) {
            config = await loadMcpConfig({
                workspaceDir: this.options.workspaceDir,
                globalConfigDir: this.options.globalConfigDir,
                env: this.options.env,
            })
        }
        this.currentConfig = config

        const servers = Object.entries(config.mcpServers || {})
        const timeoutMs = this.options.connectionTimeoutMs ?? 5000

        const initPromises = servers.map(async ([serverName, rawServerConfig]) => {
            if (rawServerConfig.disabled) {
                const info: McpServerInfo = {
                    name: serverName,
                    status: 'disabled',
                    config: rawServerConfig,
                    tools: [],
                }
                return info
            }

            const interpolatedConfig = interpolateServerConfig(
                rawServerConfig,
                this.options.env || process.env
            )

            try {
                const connectPromise = this.connectServer(serverName, interpolatedConfig)
                const timeoutPromise = new Promise<never>((_, reject) => {
                    const timer = setTimeout(() => {
                        reject(
                            new Error(
                                `MCP server '${serverName}' connection timed out after ${timeoutMs}ms`
                            )
                        )
                    }, timeoutMs)
                    if (typeof timer.unref === 'function') timer.unref()
                })

                const connectedClient = await Promise.race([connectPromise, timeoutPromise])
                this.activeClients.set(serverName, connectedClient)

                // List tools
                const toolsResponse = await connectedClient.client.listTools()
                const discoveredTools = toolsResponse?.tools || []

                const convertedTools: Tool[] = discoveredTools.map((rawTool: any) => {
                    const namespacedName = `${serverName}__${rawTool.name}`
                    return {
                        name: namespacedName,
                        description: rawTool.description || '',
                        inputSchema: rawTool.inputSchema || { type: 'object', properties: {} },
                        execute: async (input: any, context: ToolExecuteContext) => {
                            try {
                                const response = await connectedClient.client.callTool({
                                    name: rawTool.name,
                                    arguments: input,
                                })

                                if (response?.isError) {
                                    const errorContent = (response.content || [])
                                        .map((c: any) =>
                                            c.type === 'text' ? c.text : JSON.stringify(c)
                                        )
                                        .join('\n')
                                    return `Error from MCP tool ${namespacedName}: ${errorContent || 'Unknown error'}`
                                }

                                if (response?.content && Array.isArray(response.content)) {
                                    return response.content
                                        .map((c: any) =>
                                            c.type === 'text' ? c.text : JSON.stringify(c)
                                        )
                                        .join('\n')
                                }

                                return typeof response === 'string'
                                    ? response
                                    : JSON.stringify(response, null, 2)
                            } catch (err: any) {
                                return `Error executing MCP tool ${namespacedName}: ${err.message}`
                            }
                        },
                    }
                })

                this.tools.push(...convertedTools)

                const info: McpServerInfo = {
                    name: serverName,
                    status: 'connected',
                    config: interpolatedConfig,
                    tools: discoveredTools.map((t: any) => ({
                        name: t.name,
                        description: t.description,
                        inputSchema: t.inputSchema,
                    })),
                }
                return info
            } catch (err: any) {
                console.warn(`[MCP] Failed to connect to server "${serverName}": ${err.message}`)
                const info: McpServerInfo = {
                    name: serverName,
                    status: 'failed',
                    config: interpolatedConfig,
                    error: err.message,
                    tools: [],
                }
                return info
            }
        })

        const results = await Promise.allSettled(initPromises)
        this.serverInfos = results.map((res, index) => {
            if (res.status === 'fulfilled') {
                return res.value
            }
            const serverEntry = servers[index]
            const serverName = serverEntry ? serverEntry[0] : `server-${index}`
            const serverConfig = serverEntry ? serverEntry[1] : {}
            return {
                name: serverName,
                status: 'failed',
                config: serverConfig,
                error: (res.reason as Error)?.message || 'Unknown failure',
                tools: [],
            }
        })

        return this.serverInfos
    }

    private async connectServer(
        serverName: string,
        serverConfig: McpServerConfig
    ): Promise<ActiveMcpClient> {
        if (this.options.clientFactory) {
            const client = this.options.clientFactory(serverName, serverConfig)
            if (client.connect) {
                await client.connect()
            }
            return { name: serverName, config: serverConfig, client }
        }

        const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
        const client = new Client(
            {
                name: 'december-client',
                version: '1.0.0',
            },
            {
                capabilities: {},
            }
        )

        let transport: any

        if (this.options.transportFactory) {
            transport = this.options.transportFactory(serverName, serverConfig)
        } else if (serverConfig.type === 'sse' || serverConfig.url) {
            const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js')
            transport = new SSEClientTransport(new URL(serverConfig.url!))
        } else if (this.options.operations?.isSandbox || this.options.operations?.vmId) {
            transport = new SandboxStdioTransport({
                command: serverConfig.command!,
                args: serverConfig.args,
                env: serverConfig.env,
                operations: this.options.operations,
                workspaceDir: this.options.workspaceDir,
            })
        } else {
            const { StdioClientTransport } =
                await import('@modelcontextprotocol/sdk/client/stdio.js')
            transport = new StdioClientTransport({
                command: serverConfig.command!,
                args: serverConfig.args || [],
                env: serverConfig.env,
            })
        }

        await client.connect(transport)
        return { name: serverName, config: serverConfig, client, transport }
    }

    public getTools(): Tool[] {
        return [...this.tools]
    }

    public getServerInfos(): McpServerInfo[] {
        return [...this.serverInfos]
    }

    public isAutoApproved(serverName: string, toolName: string): boolean {
        const info = this.serverInfos.find((s) => s.name === serverName)
        if (!info || !info.config.autoApprove) return false

        const cleanToolName = toolName.includes('__')
            ? (toolName.split('__')[1] ?? toolName)
            : toolName
        return (
            info.config.autoApprove.includes(cleanToolName) ||
            info.config.autoApprove.includes(toolName)
        )
    }

    public async closeAll(): Promise<void> {
        for (const { client, transport } of this.activeClients.values()) {
            try {
                if (client?.close) {
                    await client.close()
                } else if (transport?.close) {
                    await transport.close()
                }
            } catch {
                // Intentionally swallowed: cleanup error
            }
        }
        this.activeClients.clear()
        this.tools = []
        this.serverInfos = []
    }

    public async reload(
        config?: McpConfigFile
    ): Promise<{ tools: Tool[]; serverInfos: McpServerInfo[] }> {
        await this.closeAll()
        const newServerInfos = await this.initialize(config || this.currentConfig)
        return {
            tools: this.getTools(),
            serverInfos: newServerInfos,
        }
    }
}
