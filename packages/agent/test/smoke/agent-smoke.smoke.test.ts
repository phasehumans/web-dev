import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { runAgentLoop } from '../../src/agent-loop'
import { AgentHarness } from '../../src/harness/agent-harness'
import { MockLLM } from '../mock-provider'

describe('Agent Subsystem Smoke Tests', () => {
    it('boots harness, discovers workspace rules, instantiates agent, executes simple turn, and clears context', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-smoke-'))
        try {
            fs.writeFileSync(
                path.join(tmpDir, 'AGENTS.md'),
                '# Smoke Agent Guide\nBe fast and reliable.'
            )

            const mockLlm = new MockLLM()
            mockLlm.pushResponse('Smoke test response verified.')

            const harness = new AgentHarness({
                llm: mockLlm,
                tools: [],
                operations: {} as any,
                workspaceDir: tmpDir,
            })

            const agent = harness.getAgent()
            expect(agent.systemPrompt).toContain('Smoke Agent Guide')

            const events: string[] = []
            for await (const event of runAgentLoop(agent, 'Ping smoke test')) {
                events.push(event.type)
            }

            expect(events).toContain('AgentStart')
            expect(events).toContain('StreamChunk')
            expect(events).toContain('AgentEnd')
            expect(agent.messages[agent.messages.length - 1]?.content).toBe(
                'Smoke test response verified.'
            )

            await agent.clearContext()
            expect(agent.messages.length).toBe(1)
            expect(agent.messages[0]?.role).toBe('system')
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
