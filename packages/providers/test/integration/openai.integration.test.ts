import { describe, expect, test, mock, afterEach, beforeEach } from 'bun:test'

import { openaiProvider, OpenAIProvider } from '../../src/providers/openai'

let capturedOptions: any = null

mock.module('openai', () => {
    return {
        OpenAI: class MockOpenAI {
            public chat = {
                completions: {
                    create: mock(async (options: any) => {
                        capturedOptions = options
                        return {
                            async *[Symbol.asyncIterator]() {
                                yield { usage: { prompt_tokens: 10, completion_tokens: 20 } }
                                yield { choices: [{ delta: { content: 'hello ' } }] }
                                yield { choices: [{ delta: { content: 'world' } }] }
                                yield {
                                    choices: [
                                        {
                                            delta: {
                                                tool_calls: [
                                                    {
                                                        id: 'call_1',
                                                        index: 0,
                                                        function: {
                                                            name: 'get_weather',
                                                            arguments: '{"location":"Paris"}',
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
                },
            }
            public options: any
            constructor(options: any) {
                this.options = options
            }
        },
    }
})

describe('OpenAI Provider (Integration)', () => {
    const origEnv = process.env.OPENAI_API_KEY

    beforeEach(() => {
        capturedOptions = null
    })

    afterEach(() => {
        process.env.OPENAI_API_KEY = origEnv
    })

    test('should initialize with correct API key', () => {
        const provider = openaiProvider('https://custom.api', 'test-key')
        expect(provider.id).toBe('openai')
    })

    test('should stream text, tools, and usage chunks correctly', async () => {
        const provider = openaiProvider(undefined, 'test-key')
        const gen = provider.stream([{ role: 'user', content: 'Say hello' }])

        const chunks: any[] = []
        for await (const chunk of gen) {
            chunks.push(chunk)
        }

        expect(chunks.length).toBe(4)
        expect(chunks[0]).toEqual({ type: 'usage', promptTokens: 10, completionTokens: 20 })
        expect(chunks[1]).toEqual({ type: 'text', text: 'hello ' })
        expect(chunks[2]).toEqual({ type: 'text', text: 'world' })
        expect(chunks[3]).toEqual({
            type: 'tool_call_delta',
            id: 'call_1',
            name: 'get_weather',
            inputDelta: '{"location":"Paris"}',
        })
    })

    test('should correctly transform messages and tools to OpenAI format', async () => {
        const provider = openaiProvider(undefined, 'test-key')
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
        expect(capturedOptions.messages).toEqual([
            { role: 'system', content: 'You are an AI' },
            { role: 'user', content: 'hello' },
            {
                role: 'assistant',
                content: 'thinking',
                tool_calls: [
                    { id: 't1', type: 'function', function: { name: 'calc', arguments: '{}' } },
                ],
            },
            { role: 'tool', content: '42', tool_call_id: 't1' },
        ])
        expect(capturedOptions.tools).toEqual([
            {
                type: 'function',
                function: { name: 'calc', description: 'calculate', parameters: {} },
            },
        ])
    })

    test('OpenAIProvider class wrapper instantiates and forwards stream', () => {
        const provider = new OpenAIProvider('http://local', 'key')
        expect(provider.id).toBe('openai')
        expect(provider.stream).toBeInstanceOf(Function)
    })

    test('should map thinkingLevel to reasoning_effort', async () => {
        const provider = openaiProvider('test-key')
        const gen = provider.stream([{ role: 'user', content: 'hello' }], undefined, undefined, {
            thinkingLevel: 'medium',
        })

        const it = gen[Symbol.asyncIterator]()
        await it.next()

        expect(capturedOptions).not.toBeNull()
        expect(capturedOptions.reasoning_effort).toBe('medium')
    })

    test('should yield thinking_delta when choice.delta contains reasoning_content', async () => {
        const choiceDelta = { reasoning_content: 'Deep reasoning step 1' }
        const reasoning =
            (choiceDelta as any).reasoning_content ||
            (choiceDelta as any).reasoning ||
            (choiceDelta as any).thought ||
            (choiceDelta as any).thinking

        expect(reasoning).toBe('Deep reasoning step 1')
    })
})
