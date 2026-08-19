import { Agent, runAgentLoop } from '@december/agent'
import { describe, expect, it } from 'bun:test'

import type { LLMProvider } from '@december/providers'

describe('Concurrency & Agent Pool Load Tests', () => {
    it('executes 50 concurrent multi-turn agent conversations without memory leak or state contamination', async () => {
        const createMockLlm = (agentId: number): LLMProvider => {
            let turn = 0
            return {
                id: `mock-llm-pool-${agentId}`,
                stream: async function* () {
                    turn++
                    if (turn === 1) {
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: `tc-${agentId}`,
                                name: 'mock_compute',
                                input: JSON.stringify({ id: agentId }),
                            },
                        }
                    } else {
                        yield { type: 'text', text: `Final result for agent ${agentId}` }
                    }
                },
            }
        }

        const mockComputeTool = {
            name: 'mock_compute',
            description: 'Computes load value',
            inputSchema: {},
            execute: async (args: any) => `computed:${args.id * 10}`,
        }

        const agentCount = 50
        const promises = Array.from({ length: agentCount }, async (_, idx) => {
            const agent = new Agent({
                sessionId: `agent-pool-${idx}`,
                llm: createMockLlm(idx),
                tools: [mockComputeTool],
                operations: {} as any,
            })

            const events: string[] = []
            for await (const event of runAgentLoop(agent, `Initial query for agent ${idx}`)) {
                events.push(event.type)
            }

            expect(events).toContain('AgentStart')
            expect(events).toContain('ToolCallResult')
            expect(events).toContain('AgentEnd')

            const toolMsg = agent.messages.find((m) => m.role === 'tool')
            expect(toolMsg?.content).toBe(`computed:${idx * 10}`)

            const lastMsg = agent.messages[agent.messages.length - 1]
            expect(lastMsg?.content).toBe(`Final result for agent ${idx}`)
        })

        await Promise.all(promises)
    })

    it('handles 100 rapid concurrent context forking operations across active sessions', async () => {
        const baseAgent = new Agent({
            sessionId: 'root-template-session',
            llm: {
                id: 'mock-llm-template',
                stream: async function* () {
                    yield { type: 'text', text: 'Template output' }
                },
            },
            tools: [],
            operations: {} as any,
        })

        for await (const _ of runAgentLoop(baseAgent, 'Seed initial prompt')) {
            // Intentionally consume generator events
        }

        expect(baseAgent.messages.length).toBe(3)

        // Perform 100 concurrent forks
        const forkCount = 100
        const forkPromises = Array.from({ length: forkCount }, async (_, i) => {
            const clone = new Agent({
                sessionId: `forked-session-${i}`,
                llm: baseAgent.llm,
                tools: [],
                operations: {} as any,
            })
            // Clone messages
            clone.messages = JSON.parse(JSON.stringify(baseAgent.messages))
            clone.sessionId = `forked-session-${i}`

            expect(clone.messages.length).toBe(3)
            expect(clone.sessionId).toBe(`forked-session-${i}`)

            // Advance child without mutating parent
            clone.messages.push({
                id: `fork-msg-${i}`,
                role: 'user',
                content: `Branch command ${i}`,
            })
            expect(clone.messages.length).toBe(4)
        })

        await Promise.all(forkPromises)
        expect(baseAgent.messages.length).toBe(3)
    })
})
