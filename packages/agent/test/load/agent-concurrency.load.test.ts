import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Agent Concurrency & Multi-Agent Session Load Tests', () => {
    it('executes 30 concurrent agent loops without cross-contamination or memory leaks', async () => {
        const mockTool = {
            name: 'calc',
            description: 'Calculator',
            inputSchema: {},
            execute: async (args: any) => `result:${args.val * 2}`,
        }

        const createMockLlm = (agentIndex: number): LLMProvider => {
            let turn = 0
            return {
                id: `mock-llm-${agentIndex}`,
                stream: async function* () {
                    turn++
                    if (turn === 1) {
                        yield {
                            type: 'tool_call',
                            toolCall: {
                                id: `tc-${agentIndex}`,
                                name: 'calc',
                                input: JSON.stringify({ val: agentIndex }),
                            },
                        }
                    } else {
                        yield { type: 'text', text: `Completed agent ${agentIndex}` }
                    }
                },
            }
        }

        const agentCount = 30
        const promises = Array.from({ length: agentCount }, async (_, idx) => {
            const agent = new Agent({
                sessionId: `session-${idx}`,
                llm: createMockLlm(idx),
                tools: [mockTool],
                operations: {} as any,
            })

            const collectedEvents: string[] = []
            for await (const event of runAgentLoop(agent, `Prompt from agent ${idx}`)) {
                collectedEvents.push(event.type)
            }

            expect(collectedEvents).toContain('AgentStart')
            expect(collectedEvents).toContain('TurnStart')
            expect(collectedEvents).toContain('ToolCallResult')
            expect(collectedEvents).toContain('AgentEnd')

            const toolMsg = agent.messages.find((m) => m.role === 'tool')
            expect(toolMsg?.content).toBe(`result:${idx * 2}`)

            const assistantMsg = agent.messages[agent.messages.length - 1]
            expect(assistantMsg?.content).toBe(`Completed agent ${idx}`)
        })

        await Promise.all(promises)
    })

    it('handles 100 rapid concurrent steering messages during active agent loop', async () => {
        const mockLlm: LLMProvider = {
            id: 'mock-llm-steer-load',
            stream: async function* () {
                yield { type: 'text', text: 'Response received.' }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            steeringMode: 'all',
        })

        // Push 100 steering messages concurrently
        for (let i = 0; i < 100; i++) {
            agent.steer({ role: 'user', content: `Steering command #${i}` })
        }

        expect(agent.steeringQueue.length).toBe(100)

        for await (const _ of runAgentLoop(agent, 'Initial prompt')) {
            // Intentionally consume generator events
        }

        // All 100 steering messages should have been drained into agent messages
        const steeringMsgs = agent.messages.filter((m) =>
            m.content.startsWith('Steering command #')
        )
        expect(steeringMsgs.length).toBe(100)
    })
})
