import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

import {
    resolveModelRate,
    fetchLiveModelRates,
    clearRatesCache,
} from '../../src/modules/usage/usage.rates'
import { usageService } from '../../src/modules/usage/usage.service'

describe('Usage Rates & Cost Calculation - Unit Tests', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        clearRatesCache()
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
        clearRatesCache()
    })

    describe('resolveModelRate (static catalog)', () => {
        it('resolves official rates for gemini models', () => {
            const flashRate = resolveModelRate('gemini-3.6-flash')
            expect(flashRate.inputRate).toBe(0.1)
            expect(flashRate.outputRate).toBe(0.4)

            const proRate = resolveModelRate('google/gemini-2.5-pro')
            expect(proRate.inputRate).toBe(1.25)
            expect(proRate.outputRate).toBe(5.0)
        })

        it('resolves official rates for claude models', () => {
            const sonnetRate = resolveModelRate('claude-3-7-sonnet')
            expect(sonnetRate.inputRate).toBe(3.0)
            expect(sonnetRate.outputRate).toBe(15.0)

            const haikuRate = resolveModelRate('claude-3-5-haiku-latest')
            expect(haikuRate.inputRate).toBe(0.8)
            expect(haikuRate.outputRate).toBe(4.0)
        })

        it('resolves official rates for openai models', () => {
            const gpt4oRate = resolveModelRate('gpt-4o')
            expect(gpt4oRate.inputRate).toBe(2.5)
            expect(gpt4oRate.outputRate).toBe(10.0)

            const o3Rate = resolveModelRate('o3-mini')
            expect(o3Rate.inputRate).toBe(1.1)
            expect(o3Rate.outputRate).toBe(4.4)
        })

        it('resolves official rates for deepseek models', () => {
            const chatRate = resolveModelRate('deepseek-chat')
            expect(chatRate.inputRate).toBe(0.14)
            expect(chatRate.outputRate).toBe(0.28)

            const r1Rate = resolveModelRate('deepseek-reasoner')
            expect(r1Rate.inputRate).toBe(0.55)
            expect(r1Rate.outputRate).toBe(2.19)
        })

        it('falls back to default rates for unknown models', () => {
            const fallback = resolveModelRate('unknown-custom-model')
            expect(fallback.inputRate).toBe(2.0)
            expect(fallback.outputRate).toBe(8.0)
        })
    })

    describe('fetchLiveModelRates (dynamic sync)', () => {
        it('fetches and caches live pricing from openrouter models api', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 'meta-llama/llama-3.3-70b-instruct',
                        pricing: {
                            prompt: '0.00000012', // $0.12 / 1M
                            completion: '0.00000030', // $0.30 / 1M
                        },
                    },
                ],
            }

            globalThis.fetch = mock(async () => {
                return new Response(JSON.stringify(mockResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            }) as any

            await fetchLiveModelRates(true)

            const rate = resolveModelRate('meta-llama/llama-3.3-70b-instruct')
            expect(rate.inputRate).toBeCloseTo(0.12)
            expect(rate.outputRate).toBeCloseTo(0.3)

            // Stripped model name should also work
            const strippedRate = resolveModelRate('llama-3.3-70b-instruct')
            expect(strippedRate.inputRate).toBeCloseTo(0.12)
        })

        it('gracefully handles fetch failures without throwing', async () => {
            globalThis.fetch = mock(async () => {
                throw new Error('Network error')
            }) as any

            await expect(fetchLiveModelRates(true)).resolves.toBeUndefined()
        })
    })

    describe('calculateGenerationCost', () => {
        it('returns 0 if token counts are 0', () => {
            const cost = usageService.calculateGenerationCost({
                modelName: 'gemini-3.6-flash',
                inputTokens: 0,
                outputTokens: 0,
            })
            expect(cost).toBe(0)
        })

        it('calculates accurate cost in cents with ceiling rounding', () => {
            // For gemini-3.6-flash: input = $0.10/1M, output = $0.40/1M
            // 1,000,000 input tokens = $0.10 = 10 cents
            // 1,000,000 output tokens = $0.40 = 40 cents
            const cost = usageService.calculateGenerationCost({
                modelName: 'gemini-3.6-flash',
                inputTokens: 1_000_000,
                outputTokens: 1_000_000,
            })
            expect(cost).toBe(50) // 10 + 40 cents
        })

        it('enforces minimum of 1 cent for non-zero tokens', () => {
            const cost = usageService.calculateGenerationCost({
                modelName: 'gemini-3.6-flash',
                inputTokens: 10,
                outputTokens: 10,
            })
            expect(cost).toBe(1)
        })
    })
})
