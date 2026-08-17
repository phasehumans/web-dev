import { describe, it, expect } from 'bun:test'

import { env } from '../../src/env'
import { resolveUpstreamDispatch } from '../../src/modules/cli/cli.dispatcher'

describe('CLI Multi-Provider Dispatcher - Unit Tests', () => {
    it('dispatches gemini models to direct Google Gemini API when GEMINI_API_KEY is configured', () => {
        // env.test has GEMINI_API_KEY = 'mock-gemini-key'
        const body = {
            model: 'gemini-3.6-flash',
            messages: [{ role: 'user', content: 'hello' }],
        }

        const dispatch = resolveUpstreamDispatch(body)

        expect(dispatch.providerName).toBe('gemini')
        expect(dispatch.url).toBe(
            'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
        )
        expect(dispatch.headers.Authorization).toBe(`Bearer ${env.GEMINI_API_KEY}`)
        expect(dispatch.body.model).toBe('gemini-3.6-flash')
        expect(dispatch.body.stream).toBe(true)
        expect(dispatch.body.stream_options).toEqual({ include_usage: true })
    })

    it('dispatches openrouter fallback for claude models when OPENROUTER_API_KEY is configured', () => {
        const body = {
            model: 'claude-3-7-sonnet-latest',
            messages: [{ role: 'user', content: 'hello' }],
        }

        const dispatch = resolveUpstreamDispatch(body)

        expect(dispatch.providerName).toBe('openrouter')
        expect(dispatch.url).toBe('https://openrouter.ai/api/v1/chat/completions')
        expect(dispatch.headers.Authorization).toBe(`Bearer ${env.OPENROUTER_API_KEY}`)
        expect(dispatch.body.model).toBe('anthropic/claude-3.7-sonnet')
    })

    it('normalizes prefixed model names like google/gemini-2.5-flash for direct Gemini dispatch', () => {
        const body = {
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: 'test' }],
        }

        const dispatch = resolveUpstreamDispatch(body)

        expect(dispatch.providerName).toBe('gemini')
        expect(dispatch.body.model).toBe('gemini-2.5-flash')
    })
})
