import { describe, expect, test } from 'bun:test'

import {
    openrouterProvider,
    OPENROUTER_DEFAULT_MAX_TOKENS,
} from '../../src/providers/openrouter.ts'

import type { LLMProvider } from '../../src/types.ts'

describe('OpenRouter Provider (Unit)', () => {
    const createMockBase = (generator?: any) => {
        const capturedStreamCalls: any[] = []
        const baseProvider: LLMProvider = {
            id: 'openai',
            stream: async function* (
                messages: any[],
                tools?: any[],
                systemPrompt?: string,
                modelOptions?: Record<string, any>,
                signal?: AbortSignal
            ) {
                capturedStreamCalls.push({
                    messages,
                    tools,
                    systemPrompt,
                    modelOptions,
                    signal,
                })
                if (generator) {
                    yield* generator(modelOptions)
                } else {
                    yield { type: 'text', text: 'mocked' }
                }
            },
        }
        return { baseProvider, capturedStreamCalls }
    }

    test('should instantiate openrouter provider with correct ID', () => {
        const provider = openrouterProvider('test-openrouter-key')
        expect(provider.id).toBe('openrouter')
    })

    test('should fallback to process.env if no key provided', () => {
        process.env.OPENROUTER_API_KEY = 'env-openrouter-key'
        const provider = openrouterProvider()
        expect(provider.id).toBe('openrouter')
        delete process.env.OPENROUTER_API_KEY
    })

    test('should default max_tokens to 4096 if not explicitly provided', async () => {
        const { baseProvider, capturedStreamCalls } = createMockBase()
        const provider = openrouterProvider('test-key', baseProvider)

        const stream = provider.stream([{ role: 'user', content: 'hello' }])
        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(chunks).toEqual([{ type: 'text', text: 'mocked' }])
        expect(capturedStreamCalls.length).toBe(1)
        expect(capturedStreamCalls[0].modelOptions.max_tokens).toBe(OPENROUTER_DEFAULT_MAX_TOKENS)
    })

    test('should preserve explicitly provided max_tokens', async () => {
        const { baseProvider, capturedStreamCalls } = createMockBase()
        const provider = openrouterProvider('test-key', baseProvider)

        const stream = provider.stream([{ role: 'user', content: 'hello' }], undefined, undefined, {
            max_tokens: 16,
        })
        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedStreamCalls.length).toBe(1)
        expect(capturedStreamCalls[0].modelOptions.max_tokens).toBe(16)
    })

    test('should catch 402 with affordable tokens and auto-retry with clamped tokens', async () => {
        let callCount = 0
        const generator = async function* (options: any) {
            callCount++
            if (callCount === 1) {
                throw new Error(
                    '402 This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 10666. To increase, visit https://openrouter.ai/settings/credits'
                )
            }
            yield { type: 'text', text: `recovered with ${options.max_tokens} tokens` }
        }

        const { baseProvider, capturedStreamCalls } = createMockBase(generator)
        const provider = openrouterProvider('test-key', baseProvider)
        const stream = provider.stream([{ role: 'user', content: 'hello' }], undefined, undefined, {
            max_tokens: 65536,
        })
        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedStreamCalls.length).toBe(2)
        expect(capturedStreamCalls[0].modelOptions.max_tokens).toBe(65536)
        // 10666 * 0.95 = 10132
        expect(capturedStreamCalls[1].modelOptions.max_tokens).toBe(10132)
        expect(chunks).toEqual([{ type: 'text', text: 'recovered with 10132 tokens' }])
    })

    test('should catch 402 on default max_tokens and auto-retry with lower affordable limit', async () => {
        let callCount = 0
        const generator = async function* (options: any) {
            callCount++
            if (callCount === 1) {
                throw new Error(
                    '402 This request requires more credits, or fewer max_tokens. You requested up to 4096 tokens, but can only afford 2000. To increase, visit https://openrouter.ai/settings/credits'
                )
            }
            yield { type: 'text', text: `recovered with ${options.max_tokens} tokens` }
        }

        const { baseProvider, capturedStreamCalls } = createMockBase(generator)
        const provider = openrouterProvider('test-key', baseProvider)
        const stream = provider.stream([{ role: 'user', content: 'hello' }])
        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedStreamCalls.length).toBe(2)
        expect(capturedStreamCalls[0].modelOptions.max_tokens).toBe(4096)
        // 2000 * 0.95 = 1900
        expect(capturedStreamCalls[1].modelOptions.max_tokens).toBe(1900)
        expect(chunks).toEqual([{ type: 'text', text: 'recovered with 1900 tokens' }])
    })

    test('should throw clean error when 402 balance is exhausted (<50 tokens)', async () => {
        const generator = async function* () {
            yield* []
            throw new Error(
                '402 This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 20. To increase, visit https://openrouter.ai/settings/credits'
            )
        }

        const { baseProvider } = createMockBase(generator)
        const provider = openrouterProvider('test-key', baseProvider)
        const stream = provider.stream([{ role: 'user', content: 'hello' }])

        let error: any
        try {
            for await (const _ of stream) {
                // Intentionally consume stream to trigger error
            }
        } catch (err) {
            error = err
        }

        expect(error).toBeDefined()
        expect(error.message).toContain('OpenRouter credits exhausted or insufficient')
        expect(error.message).toContain('https://openrouter.ai/settings/credits')
        // Ensure no emojis in error message
        expect(error.message).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    })
})
