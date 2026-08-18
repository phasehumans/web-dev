import { describe, it, expect } from 'bun:test'

import { calculateUsageCost, resolveModelRate, formatUsageCard } from '../src/utils/usage-rates'

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

    it('formats a rich in-terminal usage card text with provider billing links', () => {
        const text = formatUsageCard({
            model: 'gemini-3.7-flash',
            promptTokens: 5000,
            completionTokens: 1000,
            cachedPromptTokens: 2000,
            provider: 'google',
        })

        expect(text).toContain('Session Usage & Costs')
        expect(text).toContain('5,000')
        expect(text).toContain('1,000')
        expect(text).toContain('Estimated Cost')
        expect(text).toContain('https://aistudio.google.com/app/plan_information')
    })
})
