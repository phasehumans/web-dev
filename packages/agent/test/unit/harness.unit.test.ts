import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { McpClientPool } from '@december/tools'
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

import { AgentHarness } from '../../src/harness/agent-harness'
import { MockLLM } from '../mock-provider'

describe('AgentHarness (Unit)', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    test('discovers rules and skills from AGENTS.md, .december/AGENTS.md, .december/rules.md, and .december/skills.md', () => {
        const decDir = path.join(tmpDir, '.december')
        fs.mkdirSync(decDir, { recursive: true })

        fs.writeFileSync(path.join(tmpDir, 'AGENTS.md'), '# Root Agents Guide\nRules here.')
        fs.writeFileSync(
            path.join(decDir, 'AGENTS.md'),
            '# December Agents Guide\nMore rules here.'
        )
        fs.writeFileSync(path.join(decDir, 'rules.md'), '# Workspace Rules\nSingle rules file.')
        fs.writeFileSync(path.join(decDir, 'skills.md'), '# Skills\nCustom skill content.')

        const harness = new AgentHarness({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
        })

        const agent = harness.getAgent()
        const systemPrompt = agent.systemPrompt

        expect(systemPrompt).toContain('Root Agents Guide')
        expect(systemPrompt).toContain('December Agents Guide')
        expect(systemPrompt).toContain('Workspace Rules')
        expect(systemPrompt).toContain('Custom skill content.')
        expect(systemPrompt).toContain('Inspect Logs & Stack Traces First')
        expect(systemPrompt).toContain('Root Cause Resolution')
        expect(systemPrompt).toContain('Execution & Verification')
    })

    test('uses DEFAULT_BASE_SYSTEM_PROMPT when baseSystemPrompt is omitted', () => {
        const harness = new AgentHarness({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
        })

        const systemPrompt = harness.getAgent().systemPrompt
        expect(systemPrompt).toContain('You are December, an autonomous, expert coding agent.')
        expect(systemPrompt).toContain('Inspect Logs & Stack Traces First')
        expect(systemPrompt).toContain('Root Cause Resolution')
        expect(systemPrompt).toContain('No Raw Code In Chat')
        expect(systemPrompt).toContain('Strict Workspace Boundary')
    })

    test('initializes MCP pool and mounts dynamic tools into agent tool registry', async () => {
        const mockClient = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [
                    {
                        name: 'fetch_data',
                        description: 'Fetch remote data',
                        inputSchema: { type: 'object', properties: { id: { type: 'string' } } },
                    },
                ],
            })),
            callTool: mock(async () => ({ content: [{ type: 'text', text: 'data-result' }] })),
            close: mock(async () => {}),
        }

        const pool = new McpClientPool({
            clientFactory: () => mockClient as any,
        })

        const harness = await AgentHarness.create({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
            mcpPool: pool,
            mcpConfig: {
                mcpServers: {
                    api_server: { command: 'node', args: ['server.js'] },
                },
            },
        })

        const agent = harness.getAgent()
        expect(agent.mcpPool).toBe(pool)
        expect(agent.tools.has('api_server__fetch_data')).toBe(true)

        const dynamicTool = agent.tools.get('api_server__fetch_data')
        expect(dynamicTool).toBeDefined()
        expect(dynamicTool?.description).toBe('Fetch remote data')

        const output = await dynamicTool?.execute({ id: '123' }, {} as any)
        expect(output).toBe('data-result')

        // Test reloadMCP cleanly unregisters old tools and syncs new tools without zombie entries
        const mockClientV2 = {
            connect: mock(async () => {}),
            listTools: mock(async () => ({
                tools: [
                    {
                        name: 'query_v2',
                        description: 'New tool',
                        inputSchema: {},
                    },
                ],
            })),
            callTool: mock(async () => ({ content: [{ type: 'text', text: 'v2' }] })),
            close: mock(async () => {}),
        }

        const poolV2 = new McpClientPool({
            clientFactory: () => mockClientV2 as any,
        })
        const harnessV2 = new AgentHarness({
            llm: new MockLLM(),
            tools: [],
            operations: {} as any,
            workspaceDir: tmpDir,
            mcpPool: poolV2,
        })

        await harnessV2.initMCP({
            mcpServers: {
                test_srv: { command: 'node' },
            },
        })

        const agentV2 = harnessV2.getAgent()
        expect(agentV2.tools.has('test_srv__query_v2')).toBe(true)

        // Reload with disabled server - old tool should be pruned immediately
        await harnessV2.reloadMCP({
            mcpServers: {
                test_srv: { command: 'node', disabled: true },
            },
        })

        expect(agentV2.tools.has('test_srv__query_v2')).toBe(false)
    })
})
