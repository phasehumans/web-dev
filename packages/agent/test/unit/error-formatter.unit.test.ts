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

    it('formats Arcee BYOK insufficient credits error with Arcee platform link and not December Wallet', async () => {
        const mockArceeLlm: LLMProvider = {
            id: 'arcee',
            stream: async function* () {
                yield { type: 'text', text: '' }
                const err: any = new Error('Insufficient credits.')
                err.status = 402
                throw err
            },
        }

        const agent = new Agent({
            llm: mockArceeLlm,
            tools: [],
            operations: {} as any,
            modelOptions: { model: 'trinity-large-thinking' },
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'hi')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain(
            'Insufficient credits in your Arcee AI account. Please add credits or top up your balance at https://platform.arcee.ai/api/api-keys'
        )
        expect(errorEvent.error).toContain('Insufficient credits.')
        expect(errorEvent.error).not.toContain('December Wallet')
        expect(errorEvent.error).not.toContain('https://trydecember.com/settings/billing')
    })

    it('formats OpenRouter BYOK insufficient credits error with OpenRouter settings link', async () => {
        const mockOpenRouterLlm: LLMProvider = {
            id: 'openrouter',
            stream: async function* () {
                yield { type: 'text', text: '' }
                const err: any = new Error('402 Payment Required: requires more credits')
                err.status = 402
                throw err
            },
        }

        const agent = new Agent({
            llm: mockOpenRouterLlm,
            tools: [],
            operations: {} as any,
            modelOptions: { model: 'openai/gpt-4o' },
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'hi')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain(
            'Insufficient credits in your OpenRouter account. Please add credits or top up your balance at https://openrouter.ai/settings/credits'
        )
        expect(errorEvent.error).not.toContain('December Wallet')
    })

    it('formats December Wallet insufficient credits error when provider is december', async () => {
        const mockDecemberLlm: LLMProvider = {
            id: 'december',
            stream: async function* () {
                yield { type: 'text', text: '' }
                const err: any = new Error('Insufficient credits.')
                err.status = 402
                throw err
            },
        }

        const agent = new Agent({
            llm: mockDecemberLlm,
            tools: [],
            operations: {} as any,
            modelOptions: { model: 'gemini-3.8-flash' },
        })

        const events: any[] = []
        for await (const event of runAgentLoop(agent, 'hi')) {
            events.push(event)
        }

        const errorEvent = events.find((e) => e.type === 'AgentError')
        expect(errorEvent).toBeDefined()
        expect(errorEvent.error).toContain('Insufficient credits in December Wallet')
        expect(errorEvent.error).toContain('https://trydecember.com/settings/billing')
        expect(errorEvent.error).toContain('Bring Your Own Key (BYOK)')
    })
})
