import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import {
    getProviderModels,
    getModelLabel,
    getModelContextWindow,
    isValidModelForProvider,
    getDefaultModelForProvider,
    ensureValidModelForProvider,
    fetchLiveProviderModels,
    clearProviderModelsCache,
    LIVE_MODEL_CACHE_TTL_MS,
} from '../src/utils/models'

describe('models utils', () => {
    const testConfigDir = path.join(os.tmpdir(), `december-test-models-${Date.now()}`)

    beforeAll(() => {
        clearProviderModelsCache()
        fs.mkdirSync(testConfigDir, { recursive: true })
        process.env.DECEMBER_CONFIG_DIR = testConfigDir
    })

    afterAll(() => {
        clearProviderModelsCache()
        fs.rmSync(testConfigDir, { recursive: true, force: true })
    })
    describe('getProviderModels', () => {
        it('returns anthropic models when provider is anthropic', () => {
            const models = getProviderModels('anthropic')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'claude-fable-5-1' }),
                    expect.objectContaining({ value: 'claude-opus-5' }),
                    expect.objectContaining({ value: 'claude-sonnet-5' }),
                ])
            )
            expect(models.length).toBe(11)
        })

        it('returns google models when provider is google', () => {
            const models = getProviderModels('google')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'gemini-3.8-flash' }),
                    expect.objectContaining({ value: 'gemini-3.7-flash' }),
                    expect.objectContaining({ value: 'gemini-3.6-flash' }),
                ])
            )
            expect(models.length).toBe(11)
        })

        it('returns openai models when provider is openai', () => {
            const models = getProviderModels('openai')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'gpt-5.6-sol' }),
                    expect.objectContaining({ value: 'o4-mini' }),
                    expect.objectContaining({ value: 'gpt-4o' }),
                ])
            )
            expect(models.length).toBe(17)
        })

        it('returns openrouter models with free and paid models when provider is openrouter', () => {
            const models = getProviderModels('openrouter')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        label: '(free) Meta: Llama 3 8B Instruct',
                        value: 'meta-llama/llama-3-8b-instruct:free',
                    }),
                    expect.objectContaining({
                        label: 'Anthropic: Claude 3.7 Sonnet',
                        value: 'anthropic/claude-3.7-sonnet',
                    }),
                ])
            )
            expect(models.length).toBe(26)
        })

        it('returns default model when provider is unknown', () => {
            const models = getProviderModels('unknown-provider')
            expect(models).toEqual([{ label: 'Default', value: 'default' }])
        })
    })

    describe('isValidModelForProvider', () => {
        it('validates model existence for provider', () => {
            expect(isValidModelForProvider('anthropic', 'claude-sonnet-5')).toBe(true)
            expect(isValidModelForProvider('anthropic', 'gpt-4o')).toBe(false)
            expect(isValidModelForProvider('openai', 'gpt-4o')).toBe(true)
            expect(isValidModelForProvider('december_proxy', 'gemini-3.7-flash')).toBe(true)
            expect(
                isValidModelForProvider('openrouter', 'meta-llama/llama-3.3-70b-instruct:free')
            ).toBe(true)
            expect(isValidModelForProvider('openrouter', 'custom/dynamic-model')).toBe(true)
        })
    })

    describe('getDefaultModelForProvider', () => {
        it('returns first available model for provider', () => {
            expect(getDefaultModelForProvider('anthropic')).toBe('claude-opus-5')
            expect(getDefaultModelForProvider('openai')).toBe('gpt-5.6-sol')
            expect(getDefaultModelForProvider('december_proxy')).toBe('gemini-3.8-flash')
            expect(getDefaultModelForProvider('lmstudio')).toBe('default')
            expect(getDefaultModelForProvider('llamacpp')).toBe('default')
            expect(getDefaultModelForProvider('ollama')).toBe('qwen2.5-coder:7b')
            expect(getDefaultModelForProvider('copilot')).toBe('gpt-4o')
        })
    })

    describe('ensureValidModelForProvider', () => {
        it('preserves valid model for the target provider', () => {
            expect(ensureValidModelForProvider('anthropic', 'claude-sonnet-5')).toBe(
                'claude-sonnet-5'
            )
            expect(ensureValidModelForProvider('openai', 'gpt-4o')).toBe('gpt-4o')
            expect(ensureValidModelForProvider('copilot', 'gpt-4o')).toBe('gpt-4o')
            expect(ensureValidModelForProvider('december_proxy', 'gemini-3.7-flash')).toBe(
                'gemini-3.7-flash'
            )
        })

        it('auto-switches to provider recommended model if current model is invalid for provider', () => {
            expect(ensureValidModelForProvider('anthropic', 'gpt-4o')).toBe('claude-opus-5')
            expect(ensureValidModelForProvider('openai', 'claude-sonnet-5')).toBe('gpt-5.6-sol')
            expect(ensureValidModelForProvider('google', 'gpt-5.6-sol')).toBe('gemini-3.8-flash')
            expect(ensureValidModelForProvider('copilot', 'gpt-5.6-sol')).toBe('gpt-4o')
            expect(ensureValidModelForProvider('deepseek', 'gemini-3.7-flash')).toBe(
                'deepseek-v4-pro'
            )
        })

        it('auto-switches to provider recommended model if current model is undefined', () => {
            expect(ensureValidModelForProvider('anthropic')).toBe('claude-opus-5')
            expect(ensureValidModelForProvider('openai', undefined)).toBe('gpt-5.6-sol')
            expect(ensureValidModelForProvider('ollama', undefined)).toBe('qwen2.5-coder:7b')
        })
    })

    describe('getModelLabel', () => {
        it('returns correct label for a known model value', () => {
            expect(getModelLabel('gemini-3.7-flash')).toBe('Gemini 3.7 Flash')
            expect(getModelLabel('gemini-3.6-flash')).toBe('Gemini 3.6 Flash')
            expect(getModelLabel('claude-opus-5')).toBe('Claude Opus 5')
            expect(getModelLabel('gpt-5.6-sol')).toBe('GPT-5.6 Sol')
            expect(getModelLabel('o4-mini')).toBe('o4-mini')
        })

        it('returns the value itself if model is not found', () => {
            const label = getModelLabel('unknown-model')
            expect(label).toBe('unknown-model')
        })
    })

    describe('getModelContextWindow', () => {
        it('returns 1000000 for gemini models', () => {
            expect(getModelContextWindow('gemini-3.7-flash')).toBe(1000000)
            expect(getModelContextWindow('gemini-3.6-flash')).toBe(1000000)
        })

        it('returns 200000 for claude models', () => {
            expect(getModelContextWindow('claude-3-7-sonnet-latest')).toBe(200000)
        })

        it('returns 200000 for o3-mini/o1 models', () => {
            expect(getModelContextWindow('o3-mini')).toBe(200000)
        })

        it('returns 128000 for gpt-4 and deepseek models', () => {
            expect(getModelContextWindow('gpt-4o')).toBe(128000)
            expect(getModelContextWindow('deepseek-chat')).toBe(128000)
        })

        it('returns 100000 as default', () => {
            expect(getModelContextWindow('unknown-model')).toBe(100000)
        })
    })

    describe('fetchLiveProviderModels & Caching', () => {
        it('falls back to curated models when no API key is provided', async () => {
            const models = await fetchLiveProviderModels('deepseek')
            expect(models).toEqual(getProviderModels('deepseek'))
        })

        it('dynamically discovers new live models and merges them with curated list', async () => {
            clearProviderModelsCache()

            const mockFetch = async () => {
                return new Response(
                    JSON.stringify({
                        data: [
                            { id: 'deepseek-v4-pro' },
                            { id: 'deepseek-v4-flash' },
                            { id: 'deepseek-custom-fine-tuned-v1' },
                        ],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            const models = await fetchLiveProviderModels(
                'deepseek',
                'mock-api-key',
                undefined,
                mockFetch as any
            )
            expect(models.some((m) => m.value === 'deepseek-v4-pro')).toBe(true)
            expect(models.some((m) => m.value === 'deepseek-custom-fine-tuned-v1')).toBe(true)
            expect(isValidModelForProvider('deepseek', 'deepseek-custom-fine-tuned-v1')).toBe(true)
        })

        it('handles network failure gracefully and returns curated defaults', async () => {
            clearProviderModelsCache()

            const mockFetch = async () => {
                throw new Error('Network timeout')
            }

            const models = await fetchLiveProviderModels(
                'deepseek',
                'mock-api-key',
                undefined,
                mockFetch as any
            )
            expect(models).toEqual(getProviderModels('deepseek'))
        })

        it('LIVE_MODEL_CACHE_TTL_MS is configured to 48 hours', () => {
            expect(LIVE_MODEL_CACHE_TTL_MS).toBe(48 * 60 * 60 * 1000)
        })

        it('caches fetched models for 48 hours and avoids re-fetching within TTL', async () => {
            clearProviderModelsCache()

            let fetchCalls = 0
            const mockFetch = async () => {
                fetchCalls++
                return new Response(
                    JSON.stringify({
                        data: [{ id: 'copilot-test-model' }],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            // First call should fetch
            const models1 = await fetchLiveProviderModels(
                'copilot',
                'test-token',
                undefined,
                mockFetch as any
            )
            expect(fetchCalls).toBe(1)
            expect(models1.some((m) => m.value === 'copilot-test-model')).toBe(true)

            // Second call within 48h TTL should return from cache
            const models2 = await fetchLiveProviderModels(
                'copilot',
                'test-token',
                undefined,
                mockFetch as any
            )
            expect(fetchCalls).toBe(1)
            expect(models2).toEqual(models1)
        })

        it('fetches live models for kimi using moonshot endpoint', async () => {
            clearProviderModelsCache()
            let capturedUrl = ''
            let capturedHeaders: any = {}

            const mockFetch = async (url: string, init?: any) => {
                capturedUrl = url
                capturedHeaders = init?.headers || {}
                return new Response(
                    JSON.stringify({
                        data: [{ id: 'kimi-k3-pro' }],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            const models = await fetchLiveProviderModels(
                'kimi',
                'mock-kimi-key',
                undefined,
                mockFetch as any
            )
            expect(capturedUrl).toBe('https://api.moonshot.ai/v1/models')
            expect(capturedHeaders['Authorization']).toBe('Bearer mock-kimi-key')
            expect(models.some((m) => m.value === 'kimi-k3-pro')).toBe(true)
        })

        it('uses Bearer authorization for Google Gemini OAuth tokens', async () => {
            clearProviderModelsCache()
            let capturedUrl = ''
            let capturedHeaders: any = {}

            const mockFetch = async (url: string, init?: any) => {
                capturedUrl = url
                capturedHeaders = init?.headers || {}
                return new Response(
                    JSON.stringify({
                        models: [
                            { name: 'models/gemini-custom-flash', displayName: 'Gemini Custom' },
                        ],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            const models = await fetchLiveProviderModels(
                'gemini',
                'ya29.mock-oauth-token',
                undefined,
                mockFetch as any
            )
            expect(capturedUrl).toBe('https://generativelanguage.googleapis.com/v1beta/models')
            expect(capturedHeaders['Authorization']).toBe('Bearer ya29.mock-oauth-token')
            expect(models.some((m) => m.value === 'gemini-custom-flash')).toBe(true)
        })

        it('uses query parameter key for Google Gemini standard API keys', async () => {
            clearProviderModelsCache()
            let capturedUrl = ''

            const mockFetch = async (url: string) => {
                capturedUrl = url
                return new Response(
                    JSON.stringify({
                        models: [{ name: 'models/gemini-custom-pro' }],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            await fetchLiveProviderModels('google', 'AIzaSyMockKey123', undefined, mockFetch as any)
            expect(capturedUrl).toBe(
                'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyMockKey123'
            )
        })

        it('uses Bearer and oauth-beta header for Claude subscription tokens', async () => {
            clearProviderModelsCache()
            let capturedHeaders: any = {}

            const mockFetch = async (_url: string, init?: any) => {
                capturedHeaders = init?.headers || {}
                return new Response(
                    JSON.stringify({
                        data: [{ id: 'claude-custom-v1' }],
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            }

            const models = await fetchLiveProviderModels(
                'claude',
                'mock-oauth-session-token',
                undefined,
                mockFetch as any
            )
            expect(capturedHeaders['Authorization']).toBe('Bearer mock-oauth-session-token')
            expect(capturedHeaders['anthropic-beta']).toBe('oauth-2024-11-18')
            expect(models.some((m) => m.value === 'claude-custom-v1')).toBe(true)
        })
    })
})
