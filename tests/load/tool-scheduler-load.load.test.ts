import { Agent, runAgentLoop } from '@december/agent'
import { describe, expect, it } from 'bun:test'

import type { LLMProvider } from '@december/providers'

describe('Tool Scheduler Parallelism & Load Stress Tests', () => {
    it('schedules and executes 50 read tools in parallel without bottlenecking', async () => {
        let executionCounter = 0
        const activeExecutions = new Set<number>()
        let maxConcurrentExecutions = 0

        const parallelReadTool = {
            name: 'parallel_read',
            description: 'Fast concurrent read tool',
            inputSchema: {},
            execute: async (args: any) => {
                const id = args.id
                activeExecutions.add(id)
                if (activeExecutions.size > maxConcurrentExecutions) {
                    maxConcurrentExecutions = activeExecutions.size
                }
                await new Promise((r) => setTimeout(r, 10))
                activeExecutions.delete(id)
                executionCounter++
                return `read-data-${id}`
            },
        }

        const toolCallCount = 50
        const mockToolCalls = Array.from({ length: toolCallCount }, (_, i) => ({
            id: `tc-parallel-${i}`,
            name: 'parallel_read',
            input: JSON.stringify({ id: i }),
        }))

        let loopTurn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm-tool-scheduler',
            stream: async function* () {
                loopTurn++
                if (loopTurn === 1) {
                    for (const tc of mockToolCalls) {
                        yield { type: 'tool_call', toolCall: tc }
                    }
                } else {
                    yield { type: 'text', text: 'All 50 tools executed successfully.' }
                }
            },
        }

        const agent = new Agent({
            sessionId: 'tool-scheduler-load',
            llm: mockLlm,
            tools: [parallelReadTool],
            operations: {} as any,
        })

        const events: string[] = []
        for await (const event of runAgentLoop(agent, 'Execute 50 parallel tools')) {
            events.push(event.type)
        }

        expect(executionCounter).toBe(toolCallCount)
        expect(maxConcurrentExecutions).toBeGreaterThan(1) // Parallel execution verified
        const toolMessages = agent.messages.filter((m) => m.role === 'tool')
        expect(toolMessages.length).toBe(toolCallCount)
    })
})
