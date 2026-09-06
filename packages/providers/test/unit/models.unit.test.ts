import { describe, expect, it } from 'bun:test'

import { getModelContextWindow, createProvider, MODEL_CONTEXT_WINDOWS } from '../../src/models'

describe('Models Utility & Context Windows (Unit)', () => {
    it('returns exact context window size for known model names in lookup map', () => {
        expect(getModelContextWindow('gemini-3.7-flash')).toBe(1000000)
        expect(getModelContextWindow('gemini-3.6-flash')).toBe(1000000)
        expect(getModelContextWindow('gemini-3.5-flash')).toBe(1000000)
        expect(getModelContextWindow('gemini-3-pro-preview')).toBe(1000000)
        expect(getModelContextWindow('gemini-3.1-pro')).toBe(1000000)
        expect(getModelContextWindow('claude-3-7-sonnet-latest')).toBe(200000)
        expect(getModelContextWindow('claude-3-5-sonnet-20241022')).toBe(200000)
        expect(getModelContextWindow('o3-mini')).toBe(200000)
        expect(getModelContextWindow('o1')).toBe(200000)
        expect(getModelContextWindow('gpt-4o')).toBe(128000)
        expect(getModelContextWindow('gpt-4o-mini')).toBe(128000)
        expect(getModelContextWindow('deepseek-chat')).toBe(128000)
        expect(getModelContextWindow('trinity-large-thinking')).toBe(262144)
        expect(getModelContextWindow('thinkingmachines/inkling-small')).toBe(262144)
        expect(getModelContextWindow('zai-org/glm-5.2')).toBe(262144)
        expect(getModelContextWindow('moonshotai/kimi-k3')).toBe(1000000)
        expect(getModelContextWindow('deepseek/deepseek-v4-flash-latest')).toBe(1000000)
    })

    it('returns inferred context window size based on model name substring heuristics', () => {
        expect(getModelContextWindow('custom-gemini-model')).toBe(1000000)
        expect(getModelContextWindow('custom-claude-model')).toBe(200000)
        expect(getModelContextWindow('o3-mini-custom')).toBe(200000)
        expect(getModelContextWindow('gpt-4.5-preview')).toBe(128000)
        expect(getModelContextWindow('gpt-4-custom')).toBe(128000)
        expect(getModelContextWindow('gpt-3.5-turbo')).toBe(16385)
        expect(getModelContextWindow('deepseek-v3')).toBe(128000)
        expect(getModelContextWindow('llama-3.3-70b')).toBe(128000)
        expect(getModelContextWindow('llama-3.1-8b')).toBe(128000)
        expect(getModelContextWindow('custom-trinity-model')).toBe(262144)
        expect(getModelContextWindow('inkling-small')).toBe(262144)
        expect(getModelContextWindow('model-128k-context')).toBe(131072)
        expect(getModelContextWindow('model-32k-context')).toBe(32768)
        expect(getModelContextWindow('model-8192-context')).toBe(8192)
        expect(getModelContextWindow('model-8k-context')).toBe(8192)
    })

    it('returns default fallback context window size (100000) for unknown or empty model names', () => {
        expect(getModelContextWindow('')).toBe(100000)
        expect(getModelContextWindow(null as any)).toBe(100000)
        expect(getModelContextWindow(undefined as any)).toBe(100000)
        expect(getModelContextWindow('unknown-custom-model')).toBe(100000)
    })

    it('createProvider constructs a valid LLMProvider contract object', () => {
        const dummyStream = async function* () {
            yield { type: 'text' as const, text: 'hi' }
        }

        const provider = createProvider(
            {
                id: 'test-provider',
                name: 'Test Provider',
                models: ['m1'],
                api: {},
            },
            dummyStream
        )

        expect(provider.id).toBe('test-provider')
        expect(typeof provider.stream).toBe('function')
    })

    it('MODEL_CONTEXT_WINDOWS map contains expected defaults', () => {
        expect(MODEL_CONTEXT_WINDOWS['gemini-3.7-flash']).toBe(1000000)
        expect(MODEL_CONTEXT_WINDOWS['gemini-3.6-flash']).toBe(1000000)
        expect(MODEL_CONTEXT_WINDOWS['claude-opus-5']).toBe(1000000)
        expect(MODEL_CONTEXT_WINDOWS['claude-haiku-4.5']).toBe(200000)
        expect(MODEL_CONTEXT_WINDOWS['gpt-4o']).toBe(128000)
    })
})
