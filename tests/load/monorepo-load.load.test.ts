import { Agent, runAgentLoop } from '@december/agent'
import { ReadFileTool, WriteFileTool, BashTool } from '@december/tools'
import { describe, expect, it } from 'bun:test'

import type { LLMProvider } from '@december/providers'

describe('Monorepo End-to-End System Load Tests', () => {
    it('executes 25 concurrent multi-tool agent loops across the integrated stack', async () => {
        const mockProvider: LLMProvider = {
            id: 'mock-load-provider',
            stream: async function* () {
                yield { type: 'text', text: 'System load test response chunk.' }
            },
        }

        const agentCount = 25
        const promises = Array.from({ length: agentCount }, async (_, i) => {
            const agent = new Agent({
                sessionId: `system-load-session-${i}`,
                llm: mockProvider,
                tools: [ReadFileTool, WriteFileTool, BashTool],
                operations: {} as any,
            })

            const events: string[] = []
            for await (const event of runAgentLoop(agent, `Concurrent system load prompt ${i}`)) {
                events.push(event.type)
            }

            expect(events).toContain('AgentStart')
            expect(events).toContain('StreamChunk')
            expect(events).toContain('AgentEnd')
        })

        await Promise.all(promises)
    })
})
