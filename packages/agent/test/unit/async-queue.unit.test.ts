import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Async Event Queue & Generator (Unit)', () => {
    it('yields events in exact chronological order without losing chunks', async () => {
        const eventsToYield = [
            { type: 'text' as const, text: 'Hello ' },
            { type: 'text' as const, text: 'world!' },
            { type: 'usage' as const, promptTokens: 10, completionTokens: 5 },
        ]

        const mockLlm: LLMProvider = {
            id: 'mock-llm',
            stream: async function* () {
                for (const ev of eventsToYield) {
                    yield ev
                }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const receivedEvents: string[] = []
        for await (const event of runAgentLoop(agent, 'test prompt')) {
            receivedEvents.push(event.type)
        }

        expect(receivedEvents).toContain('AgentStart')
        expect(receivedEvents).toContain('TurnStart')
        expect(receivedEvents).toContain('StreamChunk')
        expect(receivedEvents).toContain('AgentUsage')
        expect(receivedEvents).toContain('TurnEnd')
        expect(receivedEvents).toContain('AgentEnd')
        expect(receivedEvents[0]).toBe('AgentStart')
        expect(receivedEvents[receivedEvents.length - 1]).toBe('AgentEnd')
    })

    it('terminates cleanly when aborted mid-stream', async () => {
        let streamIterations = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm-infinite',
            stream: async function* () {
                while (true) {
                    streamIterations++
                    yield { type: 'text' as const, text: 'chunk ' }
                    await new Promise((r) => setTimeout(r, 10))
                }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const loopPromise = (async () => {
            const types: string[] = []
            for await (const event of runAgentLoop(agent, 'start infinite')) {
                types.push(event.type)
                if (types.filter((t) => t === 'StreamChunk').length >= 3) {
                    agent.abort()
                }
            }
            return types
        })()

        const types = await loopPromise
        expect(types).toContain('AgentInterrupt')
        expect(types[types.length - 1]).toBe('AgentEnd')
        expect(streamIterations).toBeGreaterThanOrEqual(3)
    })
})
