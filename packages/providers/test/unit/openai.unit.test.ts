import { describe, expect, it } from 'bun:test'

import { openaiProvider, OpenAIProvider } from '../../src/providers/openai'

describe('OpenAI Provider Adapter (Unit)', () => {
    it('instantiates OpenAIProvider class wrapper correctly', () => {
        const provider = new OpenAIProvider('http://localhost:8000', 'test-key')
        expect(provider.id).toBe('openai')
        expect(typeof provider.stream).toBe('function')
    })

    it('transforms system prompts, messages, tool calls, and reasoning effort accurately', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            chat: {
                completions: {
                    create: async (payload: any) => {
                        capturedPayload = payload
                        return (async function* () {
                            yield {
                                usage: { prompt_tokens: 20, completion_tokens: 10 },
                            }
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            content: 'Hello world',
                                            reasoning_content: 'Thinking steps...',
                                        },
                                    },
                                ],
                            }
                        })()
                    },
                },
            },
        }

        const provider = openaiProvider(undefined, 'test-key', undefined, mockClient)

        const messages = [
            { role: 'user', content: 'What is 2+2?' },
            {
                role: 'assistant',
                content: 'Calculation:',
                toolCalls: [{ id: 'tc-1', name: 'calc', input: '{"expr":"2+2"}' }],
            },
            { role: 'tool', content: '4', toolCallId: 'tc-1' },
        ]

        const tools = [{ name: 'calc', description: 'Calculator', inputSchema: {} }]

        const stream = provider.stream(messages, tools, 'System instruction', {
            model: 'o3-mini',
            thinkingLevel: 'high',
        })

        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedPayload).not.toBeNull()
        expect(capturedPayload.model).toBe('o3-mini')
        expect(capturedPayload.reasoning_effort).toBe('high')
        expect(capturedPayload.messages[0]).toEqual({
            role: 'system',
            content: 'System instruction',
        })
        expect(capturedPayload.messages[1]).toEqual({
            role: 'user',
            content: 'What is 2+2?',
        })
        expect(capturedPayload.messages[2]).toEqual({
            role: 'assistant',
            content: 'Calculation:',
            tool_calls: [
                {
                    id: 'tc-1',
                    type: 'function',
                    function: { name: 'calc', arguments: '{"expr":"2+2"}' },
                },
            ],
        })
        expect(capturedPayload.messages[3]).toEqual({
            role: 'tool',
            tool_call_id: 'tc-1',
            content: '4',
        })

        expect(chunks).toEqual([
            { type: 'usage', promptTokens: 20, completionTokens: 10 },
            { type: 'thinking_delta', text: 'Thinking steps...' },
            { type: 'text', text: 'Hello world' },
        ])
    })

    it('maps reasoning effort levels correctly for minimal, low, medium, high', async () => {
        const testCases = [
            { thinkingLevel: 'minimal', expected: 'low' },
            { thinkingLevel: 'low', expected: 'low' },
            { thinkingLevel: 'medium', expected: 'medium' },
            { thinkingLevel: 'high', expected: 'high' },
            { thinkingLevel: 'off', expected: undefined },
        ]

        for (const { thinkingLevel, expected } of testCases) {
            let capturedReasoning: any = null
            const mockClient: any = {
                chat: {
                    completions: {
                        create: async (payload: any) => {
                            capturedReasoning = payload.reasoning_effort
                            return (async function* () {})()
                        },
                    },
                },
            }

            const provider = openaiProvider(undefined, 'test-key', undefined, mockClient)

            const stream = provider.stream(
                [{ role: 'user', content: 'test' }],
                undefined,
                undefined,
                {
                    thinkingLevel,
                }
            )
            for await (const _ of stream) {
                // Intentionally empty: consuming stream generator to capture reasoning effort payload
            }

            expect(capturedReasoning).toBe(expected)
        }
    })

    it('streams tool call deltas correctly across index mappings', async () => {
        const mockClient: any = {
            chat: {
                completions: {
                    create: async () => {
                        return (async function* () {
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            tool_calls: [
                                                {
                                                    index: 0,
                                                    id: 'call_abc',
                                                    function: { name: 'read_file', arguments: '' },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            }
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            tool_calls: [
                                                {
                                                    index: 0,
                                                    function: { arguments: '{"path":' },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            }
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            tool_calls: [
                                                {
                                                    index: 0,
                                                    function: { arguments: '"foo.txt"}' },
                                                },
                                            ],
                                        },
                                    },
                                ],
                            }
                        })()
                    },
                },
            },
        }

        const provider = openaiProvider(undefined, 'test-key', undefined, mockClient)

        const stream = provider.stream([{ role: 'user', content: 'read file' }])
        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(chunks.length).toBe(3)
        expect(chunks[0]).toEqual({
            type: 'tool_call_delta',
            id: 'call_abc',
            name: 'read_file',
            inputDelta: '',
        })
        expect(chunks[1]).toEqual({
            type: 'tool_call_delta',
            id: 'call_abc',
            inputDelta: '{"path":',
        })
        expect(chunks[2]).toEqual({
            type: 'tool_call_delta',
            id: 'call_abc',
            inputDelta: '"foo.txt"}',
        })
    })
})
