import { describe, expect, test, mock } from 'bun:test'

import { openrouterProvider, OPENROUTER_DEFAULT_MAX_TOKENS } from '../../src/providers/openrouter'

let capturedStreamCalls: any[] = []
let mockStreamGenerator: ((options: any) => AsyncGenerator<any, void, unknown>) | null = null

mock.module('../../src/providers/openai', () => {
    return {
        openaiProvider: mock((baseURL?: string, apiKey?: string, defaultHeaders?: any) => {
            return {
                id: 'openai',
                name: 'OpenAI',
                models: [],
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
                    if (mockStreamGenerator) {
                        yield* mockStreamGenerator(modelOptions)
                    } else {
                        yield { type: 'text', text: 'mocked' }
                    }
                },
                _mockArgs: { baseURL, apiKey, defaultHeaders },
            }
        }),
    }
})

describe('OpenRouter Provider (Unit)', () => {
    test('should wrap openaiProvider with correct headers and baseURL', () => {
        const provider = openrouterProvider('test-openrouter-key') as any

        expect(provider.id).toBe('openrouter')
        expect(provider._mockArgs.baseURL).toBe('https://openrouter.ai/api/v1')
        expect(provider._mockArgs.apiKey).toBe('test-openrouter-key')
        expect(provider._mockArgs.defaultHeaders).toEqual({
            'HTTP-Referer': 'https://trydecember.com',
            'X-Title': 'December',
        })
    })

    test('should fallback to process.env if no key provided', () => {
        process.env.OPENROUTER_API_KEY = 'env-openrouter-key'
        const provider = openrouterProvider() as any

        expect(provider._mockArgs.apiKey).toBe('env-openrouter-key')

        delete process.env.OPENROUTER_API_KEY
    })

    test('should default max_tokens to 4096 if not explicitly provided', async () => {
        capturedStreamCalls = []
        mockStreamGenerator = null
        const provider = openrouterProvider('test-key')

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
        capturedStreamCalls = []
        mockStreamGenerator = null
        const provider = openrouterProvider('test-key')

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
        capturedStreamCalls = []
        let callCount = 0
        mockStreamGenerator = async function* (options: any) {
            callCount++
            if (callCount === 1) {
                throw new Error(
                    '402 This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 10666. To increase, visit https://openrouter.ai/settings/credits'
                )
            }
            yield { type: 'text', text: `recovered with ${options.max_tokens} tokens` }
        }

        const provider = openrouterProvider('test-key')
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
        capturedStreamCalls = []
        let callCount = 0
        mockStreamGenerator = async function* (options: any) {
            callCount++
            if (callCount === 1) {
                throw new Error(
                    '402 This request requires more credits, or fewer max_tokens. You requested up to 4096 tokens, but can only afford 2000. To increase, visit https://openrouter.ai/settings/credits'
                )
            }
            yield { type: 'text', text: `recovered with ${options.max_tokens} tokens` }
        }

        const provider = openrouterProvider('test-key')
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
        capturedStreamCalls = []
        mockStreamGenerator = async function* () {
            yield* []
            throw new Error(
                '402 This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 20. To increase, visit https://openrouter.ai/settings/credits'
            )
        }

        const provider = openrouterProvider('test-key')
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
