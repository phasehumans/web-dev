import { describe, it, expect } from 'bun:test'

import {
    calculateUsageCost,
    resolveModelRate,
    formatUsageCard,
    inferProviderFromModel,
} from '../src/utils/usage-rates'

describe('CLI In-Terminal Usage & Rates (Unit)', () => {
    it('resolves official rates for claude models', () => {
        const rate = resolveModelRate('claude-3-7-sonnet')
        expect(rate.inputRate).toBe(3.0)
        expect(rate.outputRate).toBe(15.0)
    })

    it('resolves official rates for gemini models', () => {
        const rate = resolveModelRate('gemini-3.7-flash')
        expect(rate.inputRate).toBe(0.1)
        expect(rate.outputRate).toBe(0.4)
    })

    it('calculates dollar costs accurately for prompt and completion tokens', () => {
        const cost = calculateUsageCost({
            model: 'claude-3-7-sonnet',
            promptTokens: 100_000,
            completionTokens: 20_000,
            cachedPromptTokens: 50_000,
        })

        expect(cost.promptCost).toBeCloseTo(0.3, 2)
        expect(cost.completionCost).toBeCloseTo(0.3, 2)
        expect(cost.totalCost).toBeGreaterThan(0)
    })

    it('resolves official rates for arcee models', () => {
        const rate = resolveModelRate('trinity-large-thinking')
        expect(rate.inputRate).toBe(0.25)
        expect(rate.outputRate).toBe(0.8)
    })

    it('infers providers accurately from model names', () => {
        expect(inferProviderFromModel('claude-3-7-sonnet-latest')).toBe('anthropic')
        expect(inferProviderFromModel('gpt-4o')).toBe('openai')
        expect(inferProviderFromModel('gemini-3.6-flash')).toBe('google')
        expect(inferProviderFromModel('deepseek-chat')).toBe('deepseek')
        expect(inferProviderFromModel('trinity-large-thinking')).toBe('arcee')
        expect(inferProviderFromModel('llama3.3:latest')).toBe('ollama')
    })

    it('formats December Cloud Wallet usage card with accurate link and no emojis or bold', () => {
        const text = formatUsageCard({
            model: 'gemini-3.6-flash',
            authMethod: 'december',
            isAuthenticated: true,
        })

        expect(text).toContain('Active Model: `gemini-3.6-flash` (December Wallet)')
        expect(text).toContain('Provider: December Cloud')
        expect(text).toContain(
            '[https://trydecember.com/settings/usage](https://trydecember.com/settings/usage)'
        )
        // Ensure no bold markers, blockquote prefixes, bullets, or emojis
        expect(text).not.toContain('**')
        expect(text).not.toContain('>')
        expect(text).not.toContain('###')
        expect(text).not.toContain('•')
        expect(/[\u{1F300}-\u{1F9FF}]/u.test(text)).toBe(false)
    })

    it('formats BYOK usage card for Google Gemini with AI Studio link and no emojis or bold', () => {
        const text = formatUsageCard({
            model: 'gemini-3.6-flash',
            authMethod: 'byok',
            provider: 'google',
            isAuthenticated: true,
        })

        expect(text).toContain('Active Model: `gemini-3.6-flash` (BYOK)')
        expect(text).toContain('Provider: Google AI Studio')
        expect(text).toContain(
            '[https://aistudio.google.com/app/usage](https://aistudio.google.com/app/usage)'
        )
        expect(text).not.toContain('**')
        expect(text).not.toContain('>')
        expect(text).not.toContain('###')
        expect(text).not.toContain('•')
        expect(/[\u{1F300}-\u{1F9FF}]/u.test(text)).toBe(false)
    })

    it('formats BYOK usage card for Anthropic with console link and no bold', () => {
        const text = formatUsageCard({
            model: 'claude-3-7-sonnet-latest',
            authMethod: 'byok',
            provider: 'anthropic',
            isAuthenticated: true,
        })

        expect(text).toContain('Active Model: `claude-3-7-sonnet-latest` (BYOK)')
        expect(text).toContain('Provider: Anthropic Console')
        expect(text).toContain(
            '[https://console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing)'
        )
        expect(text).not.toContain('**')
        expect(text).not.toContain('>')
        expect(text).not.toContain('•')
        expect(/[\u{1F300}-\u{1F9FF}]/u.test(text)).toBe(false)
    })

    it('formats Ollama usage card as local and offline without bold', () => {
        const text = formatUsageCard({
            model: 'llama3.3:latest',
            authMethod: 'byok',
            provider: 'ollama',
            isAuthenticated: true,
        })

        expect(text).toContain('Active Model: `llama3.3:latest` (Local)')
        expect(text).toContain('Provider: Ollama (Local)')
        expect(text).toContain('http://localhost:11434')
        expect(text).not.toContain('**')
        expect(text).not.toContain('>')
        expect(text).not.toContain('•')
        expect(/[\u{1F300}-\u{1F9FF}]/u.test(text)).toBe(false)
    })

    it('formats unauthenticated notice matching the standard login prompt', () => {
        const text = formatUsageCard({
            model: 'gemini-3.6-flash',
            isAuthenticated: false,
        })

        expect(text).toContain(
            'You are not logged in and have no custom API keys (BYOK) configured.'
        )
        expect(text).toContain('Please run `/login` to:')
        expect(text).toContain('Sign in with your December account (Cloud Wallet)')
        expect(text).toContain('Configure Bring Your Own Key (BYOK)')
        expect(text).not.toContain('**')
        expect(text).not.toContain('>')
        expect(/[\u{1F300}-\u{1F9FF}]/u.test(text)).toBe(false)
    })
})
