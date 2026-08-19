import { describe, expect, it, mock } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Agent Loop Hooks (Unit)', () => {
    it('calls getSteeringMessages before each turn and injects them', async () => {
        let turn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                turn++
                if (turn === 1) {
                    yield {
                        type: 'tool_call',
                        toolCall: { id: 'tc-1', name: 'dummy_tool', input: '{}' },
                    }
                } else {
                    yield { type: 'text', text: 'All done.' }
                }
            },
        }

        const dummyTool = {
            name: 'dummy_tool',
            description: 'Dummy',
            inputSchema: {},
            execute: async () => 'tool output',
        }

        const getSteeringMessagesMock = mock(async () => {
            return [{ role: 'user' as const, content: 'steered instruction' }]
        })

        const agent = new Agent({
            llm: mockLlm,
            tools: [dummyTool],
            operations: {} as any,
            hooks: {
                getSteeringMessages: getSteeringMessagesMock,
            },
        })

        for await (const _event of runAgentLoop(agent, 'start prompt')) {
            // consume
        }

        expect(getSteeringMessagesMock).toHaveBeenCalled()
        const steeringMsg = agent.messages.find((m) => m.content === 'steered instruction')
        expect(steeringMsg).toBeDefined()
    })

    it('respects shouldStopAfterTurn hook to terminate loop early', async () => {
        let callCount = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm-loop',
            stream: async function* () {
                callCount++
                yield {
                    type: 'tool_call',
                    toolCall: { id: `tc-${callCount}`, name: 'repeat_tool', input: '{}' },
                }
            },
        }

        const repeatTool = {
            name: 'repeat_tool',
            description: 'Repeat tool',
            inputSchema: {},
            execute: async () => 'repeat result',
        }

        const shouldStopMock = mock(async () => {
            return callCount >= 2
        })

        const agent = new Agent({
            llm: mockLlm,
            tools: [repeatTool],
            operations: {} as any,
            hooks: {
                shouldStopAfterTurn: shouldStopMock,
            },
        })

        for await (const _event of runAgentLoop(agent, 'start loop')) {
            // consume
        }

        expect(callCount).toBe(2)
        expect(shouldStopMock).toHaveBeenCalled()
    })

    it('allows prepareNextTurn to mutate modelOptions and systemPrompt', async () => {
        let turn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm-options',
            stream: async function* () {
                turn++
                if (turn === 1) {
                    yield {
                        type: 'tool_call',
                        toolCall: { id: 'tc-1', name: 'dummy_tool', input: '{}' },
                    }
                } else {
                    yield { type: 'text', text: 'Completed.' }
                }
            },
        }

        const dummyTool = {
            name: 'dummy_tool',
            description: 'Dummy',
            inputSchema: {},
            execute: async () => 'result',
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [dummyTool],
            operations: {} as any,
            hooks: {
                prepareNextTurn: async () => ({
                    modelOptions: { temperature: 0.2 },
                    systemPrompt: 'Updated system prompt',
                }),
            },
        })

        for await (const _event of runAgentLoop(agent, 'start prompt')) {
            // consume
        }

        expect(agent.modelOptions?.temperature).toBe(0.2)
        expect(agent.systemPrompt).toBe('Updated system prompt')
    })
})
