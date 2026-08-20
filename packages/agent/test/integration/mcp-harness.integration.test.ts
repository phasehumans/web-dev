import { McpClientPool } from '@december/tools'
import { describe, expect, it, mock } from 'bun:test'

import { runAgentLoop } from '../../src/agent-loop'
import { AgentHarness } from '../../src/harness/agent-harness'

import type { LLMProvider } from '@december/providers'

describe('MCP Agent Harness & Dynamic Tool Integration', () => {
    it('mounts dynamic stdio and sse MCP tools and executes agent turn with tool invocation', async () => {
        const stdioClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [
                    {
                        name: 'query',
                        description: 'Execute SQL query',
                        inputSchema: { type: 'object', properties: { sql: { type: 'string' } } },
                    },
                ],
            })),
            callTool: mock(async (args: any) => ({
                content: [{ type: 'text', text: `SQL output for: ${args.arguments.sql}` }],
            })),
            close: mock(async () => {}),
        }

        const sseClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [
                    {
                        name: 'fetch_issue',
                        description: 'Fetch GitHub issue',
                        inputSchema: {
                            type: 'object',
                            properties: { issueId: { type: 'number' } },
                        },
                    },
                ],
            })),
            callTool: mock(async (args: any) => ({
                content: [
                    { type: 'text', text: `Issue #${args.arguments.issueId}: Feature Request` },
                ],
            })),
            close: mock(async () => {}),
        }

        const pool = new McpClientPool({
            clientFactory: (serverName) => {
                if (serverName === 'sqlite') return stdioClient as any
                return sseClient as any
            },
        })

        let loopTurn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                loopTurn++
                if (loopTurn === 1) {
                    // Turn 1: Model calls the namespaced MCP tool
                    yield {
                        type: 'tool_call',
                        toolCall: {
                            id: 'tc-mcp-1',
                            name: 'sqlite__query',
                            input: JSON.stringify({ sql: 'SELECT name FROM users;' }),
                        },
                    }
                } else {
                    // Turn 2: Model provides final response using tool output
                    yield { type: 'text', text: 'The user database query completed.' }
                }
            },
        }

        const harness = await AgentHarness.create({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            workspaceDir: '/workspace',
            mcpPool: pool,
            mcpConfig: {
                mcpServers: {
                    sqlite: { command: 'uvx', args: ['mcp-server-sqlite'] },
                    github: { url: 'http://localhost:8000/sse', type: 'sse' },
                },
            },
        })

        const agent = harness.getAgent()

        // Verify namespaced tool registration (ADR-0004)
        expect(agent.tools.has('sqlite__query')).toBe(true)
        expect(agent.tools.has('github__fetch_issue')).toBe(true)

        // Execute turn
        for await (const _ of runAgentLoop(agent, 'Check the users table')) {
            // consume events
        }

        expect(stdioClient.callTool).toHaveBeenCalledWith({
            name: 'query',
            arguments: { sql: 'SELECT name FROM users;' },
        })

        const toolResultMsg = agent.messages.find((m) => m.role === 'tool')
        expect(toolResultMsg?.content).toBe('SQL output for: SELECT name FROM users;')

        const finalAssistantMsg = agent.messages[agent.messages.length - 1]
        expect(finalAssistantMsg?.content).toBe('The user database query completed.')
    })

    it('boots harness and executes turns even when an MCP server fails or times out (ADR-0005)', async () => {
        const healthyClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [{ name: 'healthcheck', description: 'Check health' }],
            })),
            callTool: mock(async () => ({ content: [{ type: 'text', text: 'healthy' }] })),
            close: mock(async () => {}),
        }

        const hangingClient = {
            connect: mock(async () => {
                await new Promise(() => {}) // hangs
            }),
            close: mock(async () => {}),
        }

        const pool = new McpClientPool({
            connectionTimeoutMs: 50,
            clientFactory: (serverName) => {
                if (serverName === 'healthy_srv') return healthyClient as any
                return hangingClient as any
            },
        })

        const harness = await AgentHarness.create({
            llm: {
                id: 'mock-llm',
                stream: async function* () {
                    yield { type: 'text', text: 'All operational.' }
                },
            },
            tools: [],
            operations: {} as any,
            workspaceDir: '/workspace',
            mcpPool: pool,
            mcpConfig: {
                mcpServers: {
                    healthy_srv: { command: 'node', args: ['healthy.js'] },
                    failing_srv: { command: 'hang' },
                },
            },
        })

        const agent = harness.getAgent()

        // Healthy tools are mounted
        expect(agent.tools.has('healthy_srv__healthcheck')).toBe(true)

        // Failing server is marked failed
        const serverInfos = pool.getServerInfos()
        expect(serverInfos.find((s) => s.name === 'failing_srv')?.status).toBe('failed')
        expect(serverInfos.find((s) => s.name === 'healthy_srv')?.status).toBe('connected')

        // Agent loop completes successfully
        for await (const _ of runAgentLoop(agent, 'Ping')) {
            // consume
        }

        const lastMsg = agent.messages[agent.messages.length - 1]
        expect(lastMsg?.content).toBe('All operational.')
    })
})
