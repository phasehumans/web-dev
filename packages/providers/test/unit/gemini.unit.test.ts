import { describe, expect, it } from 'bun:test'

import { geminiProvider, GeminiProvider, resolveGeminiModel } from '../../src/providers/gemini'

describe('Gemini Provider Adapter (Unit)', () => {
    it('resolves model aliases and strips google/ prefix correctly', () => {
        expect(resolveGeminiModel('gemini-3.7-flash')).toBe('gemini-3.7-flash')
        expect(resolveGeminiModel('google/gemini-3.7-flash')).toBe('gemini-3.7-flash')
        expect(resolveGeminiModel('gemini-3.6-flash')).toBe('gemini-3.6-flash')
        expect(resolveGeminiModel('google/gemini-3.6-flash')).toBe('gemini-3.6-flash')
        expect(resolveGeminiModel('google/gemini-2.5-flash')).toBe('gemini-2.5-flash')
        expect(resolveGeminiModel('gemini-2.0-flash')).toBe('gemini-2.0-flash')
        expect(resolveGeminiModel('gemini-3.1-pro')).toBe('gemini-3-pro-preview')
        expect(resolveGeminiModel('google/gemini-3.1-pro')).toBe('gemini-3-pro-preview')
    })

    it('instantiates GeminiProvider class wrapper correctly', () => {
        const provider = new GeminiProvider('test-gemini-key')
        expect(provider.id).toBe('gemini')
        expect(typeof provider.stream).toBe('function')
    })

    it('sanitizes schema and transforms messages/tools for Gemini API', async () => {
        let capturedConfig: any = null

        const mockClient: any = {
            models: {
                generateContentStream: async (config: any) => {
                    capturedConfig = config
                    return (async function* () {
                        yield {
                            usageMetadata: {
                                promptTokenCount: 50,
                                candidatesTokenCount: 25,
                            },
                        }
                        yield {
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            { thought: true, text: 'Thinking about query...' },
                                            { text: 'Here is your answer.' },
                                        ],
                                    },
                                },
                            ],
                        }
                        yield {
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                functionCall: {
                                                    id: 'call_123',
                                                    name: 'search',
                                                    args: { query: 'bun test' },
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        }
                    })()
                },
            },
        }

        const provider = geminiProvider('test-key', mockClient)

        const tools = [
            {
                name: 'search',
                description: 'Search web',
                inputSchema: {
                    type: 'object',
                    properties: {
                        mode: { const: 'fast' },
                    },
                },
            },
        ]

        const messages = [{ role: 'user', content: 'Search fast' }]

        const stream = provider.stream(messages, tools, 'System instruction', {
            model: 'gemini-2.5-flash',
        })

        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedConfig).not.toBeNull()
        expect(capturedConfig.model).toBe('gemini-2.5-flash')
        expect(capturedConfig.config.systemInstruction).toEqual({
            parts: [{ text: 'System instruction' }],
        })
        expect(capturedConfig.config.tools[0].functionDeclarations[0]).toEqual({
            name: 'search',
            description: 'Search web',
            parameters: {
                type: 'object',
                properties: {
                    mode: { enum: ['fast'] },
                },
            },
        })

        expect(chunks).toEqual([
            { type: 'thinking_delta', text: 'Thinking about query...' },
            { type: 'text', text: 'Here is your answer.' },
            {
                type: 'tool_call_delta',
                id: '{"id":"call_123"}',
                name: 'search',
                inputDelta: '{"query":"bun test"}',
            },
            { type: 'usage', promptTokens: 50, completionTokens: 25 },
        ])
    })

    it('maps thinkingLevel correctly to thinkingConfig with includeThoughts', async () => {
        let capturedConfig: any = null

        const mockClient: any = {
            models: {
                generateContentStream: async (config: any) => {
                    capturedConfig = config
                    return (async function* () {
                        yield { candidates: [{ content: { parts: [{ text: 'done' }] } }] }
                    })()
                },
            },
        }

        const provider = geminiProvider('test-key', mockClient)

        // 1. Medium thinking level
        const streamMedium = provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'medium',
        })
        for await (const _ of streamMedium) {
            // consume
        }
        expect(capturedConfig.config.thinkingConfig).toEqual({
            thinkingBudget: 4096,
            includeThoughts: true,
        })

        // 2. Off thinking level
        const streamOff = provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'off',
        })
        for await (const _ of streamOff) {
            // consume
        }
        expect(capturedConfig.config.thinkingConfig).toEqual({
            thinkingBudget: 0,
        })

        // 3. Auto thinking level
        const streamAuto = provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'auto',
        })
        for await (const _ of streamAuto) {
            // consume
        }
        expect(capturedConfig.config.thinkingConfig).toEqual({
            includeThoughts: true,
        })

        // 4. Default / undefined thinking level
        const streamDefault = provider.stream(
            [{ role: 'user', content: 'test' }],
            [],
            undefined,
            {}
        )
        for await (const _ of streamDefault) {
            // consume
        }
        expect(capturedConfig.config.thinkingConfig).toEqual({
            includeThoughts: true,
        })
    })

    it('configures maxOutputTokens defaulting to 65536 and scales with thinkingBudget', async () => {
        let capturedConfig: any = null

        const mockClient: any = {
            models: {
                generateContentStream: async (config: any) => {
                    capturedConfig = config
                    return (async function* () {
                        yield {
                            candidates: [
                                {
                                    finishReason: 'MAX_TOKENS',
                                    content: { parts: [{ text: 'truncated' }] },
                                },
                            ],
                        }
                    })()
                },
            },
        }

        const provider = geminiProvider('test-key', mockClient)

        // 1. Default maxOutputTokens when unspecified
        const stream1 = provider.stream([{ role: 'user', content: 'hi' }])
        for await (const _ of stream1) {
            // consume
        }
        expect(capturedConfig.config.maxOutputTokens).toBe(65536)

        // 2. Explicit max_tokens preserved
        const stream2 = provider.stream([{ role: 'user', content: 'hi' }], [], undefined, {
            max_tokens: 8192,
        })
        for await (const _ of stream2) {
            // consume
        }
        expect(capturedConfig.config.maxOutputTokens).toBe(8192)

        // 3. High thinkingLevel scales maxOutputTokens headroom
        const stream3 = provider.stream([{ role: 'user', content: 'hi' }], [], undefined, {
            thinkingLevel: 'high',
            max_tokens: 4096,
        })
        for await (const _ of stream3) {
            // consume
        }
        // high budget = 8192, budget + 16384 = 24576
        expect(capturedConfig.config.maxOutputTokens).toBe(24576)
    })
})
