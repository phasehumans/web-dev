import { describe, expect, it } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'

import type { LLMProvider } from '@december/providers'

describe('Agent Error Formatter & Edge Cases (Unit)', () => {
    it('handles nested JSON error strings within error objects', async () => {
        const errorJson = JSON.stringify({ error: { message: 'Invalid API key provided' } })
        const mockLlm: LLMProvider = {
            id: 'mock-error',
            stream: async function* () {
                yield { type: 'text', text: '' }
                const err = new Error(errorJson)
                throw err
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'trigger error')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain('Invalid API key provided')
    })

    it('handles custom error cause chains', async () => {
        const rootCause = new Error('Root network failure: Connection reset by peer')
        const outerError = new Error('Upstream failed')
        outerError.cause = rootCause

        const mockLlm: LLMProvider = {
            id: 'mock-error-cause',
            stream: async function* () {
                yield { type: 'text', text: '' }
                throw outerError
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'trigger cause error')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain('Upstream failed')
    })

    it('handles direct error messages from provider', async () => {
        const mockLlm: LLMProvider = {
            id: 'mock-http-data',
            stream: async function* () {
                yield { type: 'text', text: '' }
                throw new Error('Invalid model parameter value')
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'trigger http error')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain('Invalid model parameter value')
    })
})
