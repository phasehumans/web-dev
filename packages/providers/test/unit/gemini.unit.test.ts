import { describe, expect, it } from 'bun:test'

import { geminiProvider, GeminiProvider } from '../../src/providers/gemini'

describe('Gemini Provider Adapter (Unit)', () => {
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
            role: 'system',
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
})
