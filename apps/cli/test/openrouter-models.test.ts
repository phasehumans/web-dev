import { describe, expect, test, beforeEach, mock } from 'bun:test'

import {
    fetchOpenRouterModels,
    clearOpenRouterModelsCache,
    FALLBACK_OPENROUTER_MODELS,
} from '../src/utils/openrouter-models'

describe('openrouter-models', () => {
    beforeEach(() => {
        clearOpenRouterModelsCache()
    })

    test('fetches, formats free tags, and sorts free models to the top', async () => {
        const mockApiResponse = {
            data: [
                {
                    id: 'openai/gpt-4o',
                    name: 'OpenAI: GPT-4o',
                    pricing: { prompt: '0.0000025', completion: '0.00001' },
                },
                {
                    id: 'meta-llama/llama-3.3-70b-instruct:free',
                    name: 'Meta: Llama 3.3 70B Instruct (free)',
                    pricing: { prompt: '0', completion: '0' },
                },
                {
                    id: 'anthropic/claude-3.7-sonnet',
                    name: 'Anthropic: Claude 3.7 Sonnet',
                    pricing: { prompt: '0.000003', completion: '0.000015' },
                },
                {
                    id: 'mistralai/mistral-7b-instruct:free',
                    name: 'Mistral: Mistral 7B Instruct',
                    pricing: { prompt: '0', completion: '0' },
                },
            ],
        }

        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => {
            return new Response(JSON.stringify(mockApiResponse), { status: 200 })
        }) as any

        try {
            const models = await fetchOpenRouterModels()
            expect(models).toHaveLength(4)

            // Free models should be sorted first
            expect(models[0].label).toBe('(free) Meta: Llama 3.3 70B Instruct')
            expect(models[0].value).toBe('meta-llama/llama-3.3-70b-instruct:free')

            expect(models[1].label).toBe('(free) Mistral: Mistral 7B Instruct')
            expect(models[1].value).toBe('mistralai/mistral-7b-instruct:free')

            // Paid models follow, sorted alphabetically
            expect(models[2].label).toBe('Anthropic: Claude 3.7 Sonnet')
            expect(models[2].value).toBe('anthropic/claude-3.7-sonnet')

            expect(models[3].label).toBe('OpenAI: GPT-4o')
            expect(models[3].value).toBe('openai/gpt-4o')
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    test('detects free models via :free id suffix, 0 pricing, or (free) in name', async () => {
        const mockApiResponse = {
            data: [
                {
                    id: 'google/gemini-2.0-flash-exp:free',
                    name: 'Google: Gemini 2.0 Flash Exp',
                    pricing: { prompt: '0.00001', completion: '0.00001' }, // id ends in :free
                },
                {
                    id: 'deepseek/deepseek-r1:free',
                    name: 'DeepSeek R1 (free)',
                    pricing: { prompt: '0', completion: '0' },
                },
            ],
        }

        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => {
            return new Response(JSON.stringify(mockApiResponse), { status: 200 })
        }) as any

        try {
            const models = await fetchOpenRouterModels()
            expect(models[0].label.startsWith('(free)')).toBe(true)
            expect(models[1].label.startsWith('(free)')).toBe(true)
            // Ensure no duplicate "(free) (free)"
            expect(models[0].label).not.toContain('(free) (free)')
            expect(models[1].label).not.toContain('(free) (free)')
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    test('falls back to FALLBACK_OPENROUTER_MODELS on network failure', async () => {
        const originalFetch = globalThis.fetch
        globalThis.fetch = mock(async () => {
            throw new Error('Network error')
        }) as any

        try {
            const models = await fetchOpenRouterModels()
            expect(models).toEqual(FALLBACK_OPENROUTER_MODELS)
        } finally {
            globalThis.fetch = originalFetch
        }
    })

    test('caches fetched models in memory to avoid repeated network calls', async () => {
        const mockApiResponse = {
            data: [
                {
                    id: 'openai/gpt-4o',
                    name: 'OpenAI: GPT-4o',
                    pricing: { prompt: '0.0000025', completion: '0.00001' },
                },
            ],
        }

        const originalFetch = globalThis.fetch
        const fetchMock = mock(async () => {
            return new Response(JSON.stringify(mockApiResponse), { status: 200 })
        })
        globalThis.fetch = fetchMock as any

        try {
            const firstCall = await fetchOpenRouterModels()
            const secondCall = await fetchOpenRouterModels()

            expect(firstCall).toEqual(secondCall)
            expect(fetchMock).toHaveBeenCalledTimes(1)
        } finally {
            globalThis.fetch = originalFetch
        }
    })
})
