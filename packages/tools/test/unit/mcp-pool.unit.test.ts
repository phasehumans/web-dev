import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test'

import { McpClientPool } from '../../src/mcp/pool'

import type { McpConfigFile } from '../../src/mcp/types'

describe('McpClientPool (Unit)', () => {
    let pool: McpClientPool

    beforeEach(() => {
        pool = new McpClientPool()
    })

    afterEach(async () => {
        await pool.closeAll()
    })

    it('discovers tools dynamically and prefixes names with <server>__<tool>', async () => {
        // Mock custom client transport factory to simulate healthy MCP server
        const mockClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [
                    {
                        name: 'query',
                        description: 'Run SQL query',
                        inputSchema: {
                            type: 'object',
                            properties: { sql: { type: 'string' } },
                            required: ['sql'],
                        },
                    },
                    {
                        name: 'describe_table',
                        description: 'Describe table schema',
                        inputSchema: {
                            type: 'object',
                            properties: { table: { type: 'string' } },
                        },
                    },
                ],
            })),
            callTool: mock(async (args: any) => ({
                content: [
                    {
                        type: 'text',
                        text: `Result for ${args.name}: ${JSON.stringify(args.arguments)}`,
                    },
                ],
            })),
            close: mock(async () => {}),
        }

        pool = new McpClientPool({
            clientFactory: () => mockClient as any,
        })

        const config: McpConfigFile = {
            mcpServers: {
                postgres: {
                    command: 'npx',
                    args: ['postgres-mcp'],
                    autoApprove: ['query'],
                },
            },
        }

        const serverInfos = await pool.initialize(config)

        expect(serverInfos.length).toBe(1)
        expect(serverInfos[0].name).toBe('postgres')
        expect(serverInfos[0].status).toBe('connected')
        expect(serverInfos[0].tools?.length).toBe(2)

        const tools = pool.getTools()
        expect(tools.length).toBe(2)

        const queryTool = tools.find((t) => t.name === 'postgres__query')
        expect(queryTool).toBeDefined()
        expect(queryTool?.description).toBe('Run SQL query')
        expect(queryTool?.inputSchema.properties.sql).toBeDefined()

        // Test tool execution
        const execResult = await queryTool?.execute({ sql: 'SELECT 1;' }, {} as any)
        expect(mockClient.callTool).toHaveBeenCalledWith({
            name: 'query',
            arguments: { sql: 'SELECT 1;' },
        })
        expect(execResult).toContain('Result for query: {"sql":"SELECT 1;"}')

        // Test autoApprove
        expect(pool.isAutoApproved('postgres', 'query')).toBe(true)
        expect(pool.isAutoApproved('postgres', 'postgres__query')).toBe(true)
        expect(pool.isAutoApproved('postgres', 'describe_table')).toBe(false)
    })

    it('marks disabled server as disabled and does not connect', async () => {
        const mockClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({ tools: [] })),
        }

        pool = new McpClientPool({
            clientFactory: () => mockClient as any,
        })

        const config: McpConfigFile = {
            mcpServers: {
                disabled_server: {
                    command: 'npx',
                    disabled: true,
                },
            },
        }

        const serverInfos = await pool.initialize(config)
        expect(serverInfos[0].status).toBe('disabled')
        expect(mockClient.connect).not.toHaveBeenCalled()
        expect(pool.getTools().length).toBe(0)
    })

    it('handles connection failure or timeout without crashing the pool', async () => {
        const healthyClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [{ name: 'ping', description: 'Ping server' }],
            })),
            callTool: mock(async () => ({ content: [{ type: 'text', text: 'pong' }] })),
            close: mock(async () => {}),
        }

        const brokenClient = {
            connect: mock(async () => {
                throw new Error('Connection refused: server binary missing')
            }),
            close: mock(async () => {}),
        }

        pool = new McpClientPool({
            clientFactory: (serverName) => {
                if (serverName === 'healthy') return healthyClient as any
                return brokenClient as any
            },
        })

        const config: McpConfigFile = {
            mcpServers: {
                healthy: { command: 'node', args: ['healthy.js'] },
                failing: { command: 'missing-bin', args: [] },
            },
        }

        const serverInfos = await pool.initialize(config)

        const healthyInfo = serverInfos.find((s) => s.name === 'healthy')
        const failingInfo = serverInfos.find((s) => s.name === 'failing')

        expect(healthyInfo?.status).toBe('connected')
        expect(failingInfo?.status).toBe('failed')
        expect(failingInfo?.error).toContain('Connection refused')

        // Healthy tools are still mounted
        const tools = pool.getTools()
        expect(tools.length).toBe(1)
        expect(tools[0].name).toBe('healthy__ping')
    })

    it('times out server initialization after configured timeout and marks as failed', async () => {
        const hangingClient = {
            connect: mock(async () => {
                // Hang forever
                await new Promise(() => {})
            }),
            close: mock(async () => {}),
        }

        pool = new McpClientPool({
            connectionTimeoutMs: 50, // Short timeout for unit test
            clientFactory: () => hangingClient as any,
        })

        const config: McpConfigFile = {
            mcpServers: {
                hanging_server: { command: 'hang' },
            },
        }

        const serverInfos = await pool.initialize(config)
        expect(serverInfos[0].status).toBe('failed')
        expect(serverInfos[0].error).toContain('timed out')
    })

    it('reloads servers and updates tool catalogue cleanly', async () => {
        let callCount = 0
        const mockClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => {
                callCount++
                if (callCount === 1) {
                    return { tools: [{ name: 'tool_v1' }] }
                }
                return { tools: [{ name: 'tool_v2' }, { name: 'tool_v3' }] }
            }),
            callTool: mock(async () => ({ content: [{ type: 'text', text: 'ok' }] })),
            close: mock(async () => {}),
        }

        pool = new McpClientPool({
            clientFactory: () => mockClient as any,
        })

        const config: McpConfigFile = {
            mcpServers: {
                server_a: { command: 'node' },
            },
        }

        await pool.initialize(config)
        expect(pool.getTools().map((t) => t.name)).toEqual(['server_a__tool_v1'])

        // Reload
        const reloadResult = await pool.reload(config)
        expect(reloadResult.tools.map((t) => t.name)).toEqual([
            'server_a__tool_v2',
            'server_a__tool_v3',
        ])
    })
})
