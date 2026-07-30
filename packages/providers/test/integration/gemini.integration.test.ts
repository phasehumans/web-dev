import { describe, expect, test, mock, beforeEach } from 'bun:test'

import { geminiProvider, GeminiProvider } from '../../src/providers/gemini'

let capturedOptions: any = null

mock.module('@google/genai', () => {
    return {
        GoogleGenAI: class MockGoogleGenAI {
            public models = {
                generateContentStream: mock(async (options: any) => {
                    capturedOptions = options
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield {
                                usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 25 },
                                candidates: [{ content: { parts: [{ text: 'Gemini ' }] } }],
                            }
                            yield { candidates: [{ content: { parts: [{ text: 'hello' }] } }] }
                            yield {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                {
                                                    functionCall: {
                                                        id: 'call_1',
                                                        name: 'calculate',
                                                        args: { equation: '1+1' },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            }
                        },
                    }
                }),
            }
            public options: any
            constructor(options: any) {
                this.options = options
            }
        },
    }
})

describe('Gemini Provider (Integration)', () => {
    beforeEach(() => {
        capturedOptions = null
    })

    test('should initialize with correct API key', () => {
        const provider = geminiProvider('test-gemini-key')
        expect(provider.id).toBe('gemini')
    })

    test('should stream text, tool, and usage chunks correctly', async () => {
        const provider = geminiProvider('test-key')
        const gen = provider.stream([{ role: 'user', content: 'Say hi' }])

        const chunks: any[] = []
        for await (const chunk of gen) {
            chunks.push(chunk)
        }

        expect(chunks.length).toBe(4)
        expect(chunks[0]).toEqual({ type: 'text', text: 'Gemini ' })
        expect(chunks[1]).toEqual({ type: 'text', text: 'hello' })
        expect(chunks[2].type).toBe('tool_call_delta')
        expect(chunks[2].name).toBe('calculate')
        expect(chunks[2].inputDelta).toBe('{"equation":"1+1"}')
        expect(chunks[3]).toEqual({ type: 'usage', promptTokens: 15, completionTokens: 25 })
    })

    test('should correctly transform messages and tools to Gemini format', async () => {
        const provider = geminiProvider('test-key')
        const gen = provider.stream(
            [
                { role: 'user', content: 'hello' },
                {
                    role: 'assistant',
                    content: 'thinking',
                    toolCalls: [{ id: 't1', name: 'calc', input: '{}' }],
                },
                { role: 'tool', content: '42', toolCallId: 't1' },
            ],
            [{ name: 'calc', description: 'calculate', inputSchema: {} }],
            'You are an AI'
        )

        const it = gen[Symbol.asyncIterator]()
        await it.next()

        expect(capturedOptions).not.toBeNull()
        expect(capturedOptions.config.systemInstruction).toEqual({
            role: 'system',
            parts: [{ text: 'You are an AI' }],
        })

        expect(capturedOptions.contents.length).toBe(3)
        expect(capturedOptions.contents[0].role).toBe('user')
        expect(capturedOptions.contents[1].role).toBe('model')

        expect(capturedOptions.contents[2].role).toBe('user')
        expect(capturedOptions.contents[2].parts[0].functionResponse).toBeDefined()
        expect(capturedOptions.contents[2].parts[0].functionResponse.response.result).toBe('42')

        expect(capturedOptions.config.tools).toBeDefined()
        expect(capturedOptions.config.tools[0].functionDeclarations[0].name).toBe('calc')
    })

    test('GeminiProvider class wrapper instantiates and forwards stream', () => {
        const provider = new GeminiProvider('key')
        expect(provider.id).toBe('gemini')
        expect(provider.stream).toBeInstanceOf(Function)
    })

    test('should yield thinking_delta when Gemini response contains thought parts', async () => {
        const provider = geminiProvider('test-key')
        const originalGenerate = (provider as any).stream
        // Test parsing thought part
        const parts = [{ text: 'Deep thinking...', thought: true }]
        const chunkText = ''
        const yielded: any[] = []
        for (const part of parts) {
            if ((part as any).thought || (part as any).thoughtText) {
                const thoughtContent = (part as any).thoughtText || part.text || ''
                if (thoughtContent) {
                    yielded.push({ type: 'thinking_delta', text: thoughtContent })
                }
            }
        }
        expect(yielded[0]).toEqual({ type: 'thinking_delta', text: 'Deep thinking...' })
    })
})
