import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Tool Execution Pipeline (Integration)', () => {
    it('passes signal and streams real-time updates through onStream', async () => {
        const streamUpdates: string[] = []

        const streamingTool = {
            name: 'streaming_tool',
            description: 'Streams chunks',
            inputSchema: {},
            execute: async (_args: any, ctx: any) => {
                ctx.onStream?.('chunk 1\n')
                await new Promise((r) => setTimeout(r, 10))
                ctx.onStream?.('chunk 2\n')
                return 'final tool result'
            },
        }

        let loopTurn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                loopTurn++
                if (loopTurn === 1) {
                    yield {
                        type: 'tool_call',
                        toolCall: { id: 'tc-stream', name: 'streaming_tool', input: '{}' },
                    }
                } else {
                    yield { type: 'text', text: 'Completed processing stream.' }
                }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [streamingTool],
            operations: {} as any,
        })

        for await (const event of runAgentLoop(agent, 'start stream tool')) {
            if (event.type === 'ToolExecutionUpdate') {
                streamUpdates.push(event.chunk)
            }
        }

        expect(streamUpdates).toEqual(['chunk 1\n', 'chunk 2\n'])
        const toolMsg = agent.messages.find((m) => m.role === 'tool')
        expect(toolMsg?.content).toBe('final tool result')
    })

    it('handles unknown tool gracefully by reporting tool not found error to model', async () => {
        let loopTurn = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                loopTurn++
                if (loopTurn === 1) {
                    yield {
                        type: 'tool_call',
                        toolCall: { id: 'tc-nonexistent', name: 'nonexistent_tool', input: '{}' },
                    }
                } else {
                    yield { type: 'text', text: 'Acknowledged error.' }
                }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        for await (const _ of runAgentLoop(agent, 'run missing tool')) {
            // Intentionally consume generator events
        }

        const toolResultMsg = agent.messages.find((m) => m.role === 'tool')
        expect(toolResultMsg?.content).toContain('Tool nonexistent_tool not found.')
        expect(toolResultMsg?.content).toContain('adjust your arguments')
    })
})
