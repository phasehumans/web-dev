import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Agent Resilience, Rate Limiting & Error Recovery (Integration)', () => {
    it('aborts immediately when abort signal is triggered during retry backoff', async () => {
        let attempts = 0
        const mockLlm: LLMProvider = {
            id: 'mock-llm-retry-abort',
            stream: async function* () {
                attempts++
                yield { type: 'text', text: '' }
                const err: any = new Error('Rate limit 429')
                err.status = 429
                throw err
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events: any[] = []
        const loopPromise = (async () => {
            for await (const event of runAgentLoop(agent, 'prompt')) {
                events.push(event)
                if (
                    event.type === 'AgentStatus' &&
                    event.message.includes('LLM Provider rate limit')
                ) {
                    agent.abort()
                }
            }
        })()

        await loopPromise
        expect(events.some((e) => e.type === 'AgentInterrupt')).toBe(true)
        expect(events[events.length - 1].type).toBe('AgentEnd')
    })
})
