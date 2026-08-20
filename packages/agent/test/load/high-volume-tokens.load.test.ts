import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('High-Volume Token & Stream Chunk Load Tests', () => {
    it('processes 2,000 streamed chunks without buffer starvation or event drop', async () => {
        const chunkCount = 2000
        const mockLlm: LLMProvider = {
            id: 'mock-high-volume',
            stream: async function* () {
                for (let i = 0; i < chunkCount; i++) {
                    yield { type: 'text', text: `c${i}` }
                }
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        let receivedChunkCount = 0
        let totalText = ''
        for await (const event of runAgentLoop(agent, 'start huge stream')) {
            if (event.type === 'StreamChunk') {
                receivedChunkCount++
                totalText += event.content
            }
        }

        expect(receivedChunkCount).toBe(chunkCount)
        expect(totalText.length).toBeGreaterThan(chunkCount)
        expect(agent.messages[agent.messages.length - 1]?.content).toBe(totalText)
    })
})
