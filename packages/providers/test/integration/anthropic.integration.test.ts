import { describe, expect, test, mock, beforeEach } from 'bun:test'

import { anthropicProvider, AnthropicProvider } from '../../src/providers/anthropic'

let capturedOptions: any = null

mock.module('@anthropic-ai/sdk', () => {
    return {
        default: class MockAnthropic {
            public messages = {
                create: mock(async (options: any) => {
                    capturedOptions = options
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield {
                                type: 'message_start',
                                message: { usage: { input_tokens: 15, output_tokens: 0 } },
                            }
                            yield {
                                type: 'content_block_start',
                                index: 0,
                                content_block: { type: 'text', text: '' },
                            }
                            yield {
                                type: 'content_block_delta',
                                index: 0,
                                delta: { type: 'text_delta', text: 'Anthropic ' },
                            }
                            yield {
                                type: 'content_block_delta',
                                index: 0,
                                delta: { type: 'text_delta', text: 'says hi' },
                            }
                            yield {
                                type: 'content_block_start',
                                index: 1,
                                content_block: {
                                    type: 'tool_use',
                                    id: 'tool_1',
                                    name: 'search',
                                    input: {},
                                },
                            }
                            yield {
                                type: 'content_block_delta',
                                index: 1,
                                delta: { type: 'input_json_delta', partial_json: '{"q":"' },
                            }
                            yield {
                                type: 'content_block_delta',
                                index: 1,
                                delta: { type: 'input_json_delta', partial_json: 'test"}' },
                            }
                            yield {
                                type: 'message_delta',
                                usage: { output_tokens: 25 },
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

describe('Anthropic Provider (Integration)', () => {
    beforeEach(() => {
        capturedOptions = null
    })

    test('should initialize with correct API key', () => {
        const provider = anthropicProvider('test-anthropic-key')
        expect(provider.id).toBe('anthropic')
    })

    test('should stream text, tool, and usage chunks correctly', async () => {
        const provider = anthropicProvider('test-key')
        const gen = provider.stream([{ role: 'user', content: 'Say hi' }])

        const chunks: any[] = []
        for await (const chunk of gen) {
            chunks.push(chunk)
        }

        expect(chunks.length).toBe(6)
        expect(chunks[0]).toEqual({ type: 'text', text: 'Anthropic ' })
        expect(chunks[1]).toEqual({ type: 'text', text: 'says hi' })
        expect(chunks[2]).toEqual({
            type: 'tool_call_delta',
            id: 'tool_1',
            name: 'search',
            inputDelta: '',
        })
        expect(chunks[3]).toEqual({ type: 'tool_call_delta', id: 'tool_1', inputDelta: '{"q":"' })
        expect(chunks[4]).toEqual({ type: 'tool_call_delta', id: 'tool_1', inputDelta: 'test"}' })
        expect(chunks[5]).toEqual({ type: 'usage', promptTokens: 15, completionTokens: 25 })
    })

    test('should correctly transform messages and tools to Anthropic format', async () => {
        const provider = anthropicProvider('test-key')
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
        expect(capturedOptions.system).toBe('You are an AI')
        expect(capturedOptions.messages).toEqual([
            { role: 'user', content: 'hello' },
            {
                role: 'assistant',
                content: [
                    { type: 'text', text: 'thinking' },
                    { type: 'tool_use', id: 't1', name: 'calc', input: {} },
                ],
            },
            { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '42' }] },
        ])
        expect(capturedOptions.tools).toEqual([
            { name: 'calc', description: 'calculate', input_schema: {} },
        ])
    })

    test('AnthropicProvider class wrapper instantiates and forwards stream', () => {
        const provider = new AnthropicProvider('http://local', 'key')
        expect(provider.id).toBe('anthropic')
        expect(provider.stream).toBeInstanceOf(Function)
    })

    test('should map thinkingLevel to thinking budget_tokens and max_tokens', async () => {
        const provider = anthropicProvider('test-key')
        const gen = provider.stream([{ role: 'user', content: 'hello' }], undefined, undefined, {
            thinkingLevel: 'high',
        })

        const it = gen[Symbol.asyncIterator]()
        await it.next()

        expect(capturedOptions).not.toBeNull()
        expect(capturedOptions.thinking).toEqual({ type: 'enabled', budget_tokens: 8192 })
        expect(capturedOptions.max_tokens).toBe(9216)
    })
})
