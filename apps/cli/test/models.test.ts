import { describe, it, expect } from 'bun:test'

import {
    getProviderModels,
    getModelLabel,
    getModelContextWindow,
    isValidModelForProvider,
    getDefaultModelForProvider,
} from '../src/utils/models'

describe('models utils', () => {
    describe('getProviderModels', () => {
        it('returns anthropic models when provider is anthropic', () => {
            const models = getProviderModels('anthropic')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'claude-fable-5' }),
                    expect.objectContaining({ value: 'claude-3-7-sonnet-latest' }),
                    expect.objectContaining({ value: 'claude-3-5-sonnet-latest' }),
                ])
            )
            expect(models.length).toBe(9)
        })

        it('returns google models when provider is google', () => {
            const models = getProviderModels('google')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'gemini-3.7-flash' }),
                    expect.objectContaining({ value: 'gemini-3.6-flash' }),
                    expect.objectContaining({ value: 'gemini-3-pro-preview' }),
                ])
            )
            expect(models.length).toBe(11)
        })

        it('returns openai models when provider is openai', () => {
            const models = getProviderModels('openai')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'gpt-5.6-sol' }),
                    expect.objectContaining({ value: 'o3-mini' }),
                    expect.objectContaining({ value: 'gpt-4o' }),
                ])
            )
            expect(models.length).toBe(11)
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
            expect(models.length).toBe(13)
        })

        it('returns default model when provider is unknown', () => {
            const models = getProviderModels('unknown-provider')
            expect(models).toEqual([{ label: 'Default', value: 'default' }])
        })
    })

    describe('isValidModelForProvider', () => {
        it('validates model existence for provider', () => {
            expect(isValidModelForProvider('anthropic', 'claude-3-7-sonnet-latest')).toBe(true)
            expect(isValidModelForProvider('anthropic', 'gpt-4o')).toBe(false)
            expect(isValidModelForProvider('openai', 'gpt-4o')).toBe(true)
            expect(isValidModelForProvider('december_proxy', 'gemini-3.6-flash')).toBe(true)
            expect(
                isValidModelForProvider('openrouter', 'meta-llama/llama-3.3-70b-instruct:free')
            ).toBe(true)
            expect(isValidModelForProvider('openrouter', 'custom/dynamic-model')).toBe(true)
        })
    })

    describe('getDefaultModelForProvider', () => {
        it('returns first available model for provider', () => {
            expect(getDefaultModelForProvider('anthropic')).toBe('claude-fable-5')
            expect(getDefaultModelForProvider('openai')).toBe('gpt-5.6-sol')
            expect(getDefaultModelForProvider('december_proxy')).toBe('gemini-3.7-flash')
        })
    })

    describe('getModelLabel', () => {
        it('returns correct label for a known model value', () => {
            expect(getModelLabel('gemini-3.7-flash')).toBe('Gemini 3.7 Flash')
            expect(getModelLabel('gemini-3.6-flash')).toBe('Gemini 3.6 Flash')
            expect(getModelLabel('claude-3-7-sonnet-latest')).toBe('Claude 3.7 Sonnet')
            expect(getModelLabel('o3-mini')).toBe('o3-mini')
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
})
