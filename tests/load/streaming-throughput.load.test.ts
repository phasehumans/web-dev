import { Agent, runAgentLoop } from '@december/agent'
import { describe, expect, it } from 'bun:test'

import type { LLMProvider } from '@december/providers'

describe('Streaming Throughput & Abort Signal Stress Tests', () => {
    it('processes 10,000 streamed token chunks across 10 concurrent streaming agents', async () => {
        const streamCount = 10
        const chunksPerStream = 1000

        const createStreamingLlm = (streamIdx: number): LLMProvider => ({
            id: `mock-streaming-llm-${streamIdx}`,
            stream: async function* () {
                for (let i = 0; i < chunksPerStream; i++) {
                    yield { type: 'text', text: `c${i}` }
                }
            },
        })

        const promises = Array.from({ length: streamCount }, async (_, idx) => {
            const agent = new Agent({
                sessionId: `throughput-session-${idx}`,
                llm: createStreamingLlm(idx),
                tools: [],
                operations: {} as any,
            })

            let receivedChunks = 0
            for await (const event of runAgentLoop(agent, 'Stream high token volume')) {
                if (event.type === 'StreamChunk') {
                    receivedChunks++
                }
            }

            expect(receivedChunks).toBe(chunksPerStream)
        })

        await Promise.all(promises)
    })

    it('handles an abort storm across 50 concurrent active streaming agents without crashing or leaking', async () => {
        const createInfiniteLlm = (agentIdx: number): LLMProvider => ({
            id: `mock-infinite-llm-${agentIdx}`,
            stream: async function* () {
                let chunkIdx = 0
                while (true) {
                    chunkIdx++
                    yield { type: 'text', text: `token_${chunkIdx}` }
                    await new Promise((r) => setTimeout(r, 1))
                }
            },
        })

        const agentCount = 50
        const promises = Array.from({ length: agentCount }, async (_, idx) => {
            const agent = new Agent({
                sessionId: `abort-storm-session-${idx}`,
                llm: createInfiniteLlm(idx),
                tools: [],
                operations: {} as any,
            })

            const events: string[] = []
            const loopPromise = (async () => {
                for await (const event of runAgentLoop(agent, 'Trigger abort storm')) {
                    events.push(event.type)
                    // Random abort after a few chunks
                    if (events.filter((t) => t === 'StreamChunk').length >= (idx % 10) + 1) {
                        agent.abort()
                    }
                }
            })()

            await loopPromise
            expect(events).toContain('AgentStart')
            expect(events).toContain('AgentInterrupt')
            expect(events[events.length - 1]).toBe('AgentEnd')
        })

        await Promise.all(promises)
    })
})
