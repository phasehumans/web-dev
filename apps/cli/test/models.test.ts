import { describe, it, expect } from 'bun:test'

import {
    getProviderModels,
    getModelLabel,
    getModelContextWindow,
    isValidModelForProvider,
    getDefaultModelForProvider,
    ensureValidModelForProvider,
} from '../src/utils/models'

describe('models utils', () => {
    describe('getProviderModels', () => {
        it('returns anthropic models when provider is anthropic', () => {
            const models = getProviderModels('anthropic')
            expect(models).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ value: 'claude-fable-5' }),
                    expect.objectContaining({ value: 'claude-opus-5' }),
                    expect.objectContaining({ value: 'claude-sonnet-5' }),
                ])
            )
            expect(models.length).toBe(10)
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
            expect(models.length).toBe(9)
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
            expect(models.length).toBe(13)
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
            expect(models.length).toBe(21)
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
            expect(getDefaultModelForProvider('december_proxy')).toBe('gemini-3.7-flash')
        })
    })

    describe('ensureValidModelForProvider', () => {
        it('preserves valid model for the target provider', () => {
            expect(ensureValidModelForProvider('anthropic', 'claude-sonnet-5')).toBe(
                'claude-sonnet-5'
            )
            expect(ensureValidModelForProvider('openai', 'gpt-4o')).toBe('gpt-4o')
            expect(ensureValidModelForProvider('december_proxy', 'gemini-3.7-flash')).toBe(
                'gemini-3.7-flash'
            )
        })

        it('auto-switches to provider recommended model if current model is invalid for provider', () => {
            expect(ensureValidModelForProvider('anthropic', 'gpt-4o')).toBe('claude-opus-5')
            expect(ensureValidModelForProvider('openai', 'claude-sonnet-5')).toBe('gpt-5.6-sol')
            expect(ensureValidModelForProvider('google', 'gpt-5.6-sol')).toBe('gemini-3.7-flash')
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
})
