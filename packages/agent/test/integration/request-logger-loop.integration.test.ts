import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'
import { getTurnLogs, getSessionLogPath } from '../../src/utils/request-logger'
import { MockLLM } from '../mock-provider'

describe('Request Logger Loop Integration', () => {
    it('captures pre-flight snapshots and post-flight responses across multi-turn sessions into JSONL', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'december-logger-int-'))
        const sessionId = 'session-int-421'

        try {
            const mockTool = {
                name: 'custom_calc',
                description: 'Calculates expression',
                inputSchema: { type: 'object', properties: { expr: { type: 'string' } } },
                execute: async (args: any) => `Result: ${args.expr}`,
            }

            const mcpTool = {
                name: 'github__search_issues',
                description: 'Search GitHub issues via MCP',
                inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
                execute: async () => 'Found 3 issues',
            }

            const mockLlm = new MockLLM()
            // Turn 1: Assistant calls custom_calc tool with thinking delta and usage
            mockLlm.pushResponse([
                { type: 'thinking_delta', text: 'Let me calculate this.' },
                { type: 'text', text: 'Evaluating...' },
                {
                    type: 'tool_call',
                    toolCall: { id: 'tc-421', name: 'custom_calc', input: '{"expr":"2+2"}' },
                },
                { type: 'usage', promptTokens: 120, completionTokens: 35 },
            ])
            // Turn 2: Assistant responds with final text after tool execution
            mockLlm.pushResponse([
                { type: 'text', text: 'The result is 4.' },
                { type: 'usage', promptTokens: 160, completionTokens: 15 },
            ])

            const systemPrompt = `You are December, an expert coding agent.

Available Skills:
- Automated refactoring
- Test generation

<project_context>
The user has provided the following project-specific instructions and guidelines from their .december workspace:
<project_instructions path="AGENTS.md">
Always write clean code and run tests.
</project_instructions>
<project_instructions path=".december/rules.md">
Ensure surgical diff edits.
</project_instructions>
</project_context>

Current date: 2026-08-19
Current working directory: ${tmpDir}`

            const agent = new Agent({
                sessionId,
                workspaceDir: tmpDir,
                systemPrompt,
                llm: mockLlm,
                tools: [mockTool, mcpTool],
                operations: {} as any,
                modelOptions: { model: 'gemini-3.6-flash' },
            })

            const events = []
            for await (const event of runAgentLoop(agent, 'Calculate 2+2')) {
                events.push(event)
            }

            // Verify log file exists on disk
            const logFile = getSessionLogPath(tmpDir, sessionId)
            expect(fs.existsSync(logFile)).toBe(true)

            // Read persisted JSONL logs
            const turnLogs = await getTurnLogs(tmpDir, sessionId)
            expect(turnLogs.length).toBe(2)

            // Verify Turn 1 Log Entry
            const turn1 = turnLogs[0]
            expect(turn1.turn).toBe(1)
            expect(turn1.sessionId).toBe(sessionId)
            expect(turn1.model).toBe('gemini-3.6-flash')
            expect(turn1.request.systemPromptDecomposition.basePrompt).toContain('You are December')
            expect(turn1.request.systemPromptDecomposition.skills).toEqual([
                '- Automated refactoring',
                '- Test generation',
            ])
            expect(turn1.request.systemPromptDecomposition.rules.length).toBe(2)
            expect(turn1.request.systemPromptDecomposition.rules[0].path).toBe('AGENTS.md')
            expect(turn1.request.systemPromptDecomposition.rules[0].content).toBe(
                'Always write clean code and run tests.'
            )
            expect(turn1.request.systemPromptDecomposition.rules[0].tokens).toBeGreaterThan(0)
            expect(turn1.request.systemPromptDecomposition.rules[1].path).toBe('.december/rules.md')

            // Tool schemas segregation and tokens
            expect(turn1.request.tools.length).toBe(2)
            const calcToolLog = turn1.request.tools.find((t) => t.name === 'custom_calc')
            expect(calcToolLog).toBeDefined()
            expect(calcToolLog?.isMcp).toBe(false)
            expect(calcToolLog?.tokens).toBeGreaterThan(0)

            const mcpToolLog = turn1.request.tools.find((t) => t.name === 'github__search_issues')
            expect(mcpToolLog).toBeDefined()
            expect(mcpToolLog?.isMcp).toBe(true)
            expect(mcpToolLog?.serverName).toBe('github')
            expect(mcpToolLog?.tokens).toBeGreaterThan(0)

            // Response snapshot for Turn 1
            expect(turn1.response.assistantMessage).toBe('Evaluating...')
            expect(turn1.response.thinking).toBe('Let me calculate this.')
            expect(turn1.response.toolCalls).toEqual([
                { id: 'tc-421', name: 'custom_calc', input: '{"expr":"2+2"}' },
            ])
            expect(turn1.response.usage).toEqual({
                promptTokens: 120,
                completionTokens: 35,
                totalTokens: 155,
            })
            expect(turn1.response.durationMs).toBeGreaterThanOrEqual(0)

            // Verify Turn 2 Log Entry
            const turn2 = turnLogs[1]
            expect(turn2.turn).toBe(2)
            expect(turn2.response.assistantMessage).toBe('The result is 4.')
            expect(turn2.response.toolCalls.length).toBe(0)
            expect(turn2.response.usage).toEqual({
                promptTokens: 160,
                completionTokens: 15,
                totalTokens: 175,
            })
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
