import { Tool, ToolExecuteContext } from '@december/shared'

export * from './mcp/index'

let mcpServersConfig: Record<string, any> = {}

export function configureMCP(config: Record<string, any>) {
    mcpServersConfig = config
}

export const MCPTool: Tool<any> = {
    name: 'mcp',
    description:
        'Model Context Protocol (MCP) tool integration. Call custom tools provided by MCP servers.',
    inputSchema: {
        type: 'object',
        properties: {
            server: { type: 'string' },
            tool: { type: 'string' },
            args: { type: 'object' },
        },
        required: ['server', 'tool'],
    },
    execute: async (input, context: ToolExecuteContext) => {
        const { server, tool, args } = input
        if (!mcpServersConfig || !mcpServersConfig[server]) {
            return `Error: MCP server '${server}' not found in configuration.`
        }

        try {
            const serverConfig = mcpServersConfig[server]
            const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
            const { StdioClientTransport } =
                await import('@modelcontextprotocol/sdk/client/stdio.js')

            const transport = new StdioClientTransport({
                command: serverConfig.command,
                args: serverConfig.args || [],
                env: serverConfig.env,
            })

            const client = new Client(
                {
                    name: 'december-client',
                    version: '1.0.0',
                },
                {
                    capabilities: {},
                }
            )

            await client.connect(transport)
            const result = await client.callTool({
                name: tool,
                arguments: args,
            })

            return JSON.stringify(result, null, 2)
        } catch (err: any) {
            return `MCPTool execution failed: ${err.message}`
        }
    },
}
