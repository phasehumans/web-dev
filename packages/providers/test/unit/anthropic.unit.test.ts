import { describe, expect, it } from 'bun:test'

import { anthropicProvider, AnthropicProvider } from '../../src/providers/anthropic'

describe('Anthropic Provider Adapter (Unit)', () => {
    it('instantiates AnthropicProvider class wrapper correctly', () => {
        const provider = new AnthropicProvider('http://localhost', 'test-key')
        expect(provider.id).toBe('anthropic')
        expect(typeof provider.stream).toBe('function')
    })

    it('attaches cache_control ephemeral directives to system prompt and message history', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            messages: {
                create: async (payload: any) => {
                    capturedPayload = payload
                    return (async function* () {
                        yield {
                            type: 'content_block_start',
                            index: 0,
                            content_block: { type: 'text', text: 'Hello' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 0,
                            delta: { type: 'text_delta', text: ' world!' },
                        }
                    })()
                },
            },
        }

        const provider = anthropicProvider(undefined, undefined, mockClient)

        const messages = [
            { role: 'user', content: 'Turn 1 user' },
            { role: 'assistant', content: 'Turn 1 assistant' },
            { role: 'user', content: 'Turn 2 user' },
        ]

        const stream = provider.stream(
            messages,
            [{ name: 'read_file', description: 'Read a file', inputSchema: {} }],
            'System prompt content'
        )

        for await (const _chunk of stream) {
            // Intentionally empty: consuming stream generator to capture payload
        }

        expect(capturedPayload).not.toBeNull()
        expect(Array.isArray(capturedPayload.system)).toBe(true)
        expect(capturedPayload.system[0].cache_control).toEqual({ type: 'ephemeral' })

        const lastMsg = capturedPayload.messages[capturedPayload.messages.length - 1]
        expect(lastMsg).toBeDefined()
        const lastContentBlock = Array.isArray(lastMsg.content)
            ? lastMsg.content[lastMsg.content.length - 1]
            : lastMsg.content
        expect(lastContentBlock.cache_control).toEqual({ type: 'ephemeral' })
    })

    it('calculates thinking budget tokens correctly for thinking levels', async () => {
        const testCases = [
            { thinkingLevel: 'minimal', expectedBudget: 1024, expectedMaxTokens: 4096 },
            { thinkingLevel: 'low', expectedBudget: 2048, expectedMaxTokens: 4096 },
            { thinkingLevel: 'medium', expectedBudget: 4096, expectedMaxTokens: 5120 },
            { thinkingLevel: 'high', expectedBudget: 8192, expectedMaxTokens: 9216 },
        ]

        for (const { thinkingLevel, expectedBudget, expectedMaxTokens } of testCases) {
            let capturedPayload: any = null
            const mockClient: any = {
                messages: {
                    create: async (payload: any) => {
                        capturedPayload = payload
                        return (async function* () {})()
                    },
                },
            }

            const provider = anthropicProvider(undefined, undefined, mockClient)
            const stream = provider.stream(
                [{ role: 'user', content: 'hello' }],
                undefined,
                undefined,
                {
                    thinkingLevel,
                }
            )

            for await (const _chunk of stream) {
                // Intentionally empty: consuming stream generator to capture payload
            }

            expect(capturedPayload).not.toBeNull()
            expect(capturedPayload.thinking).toEqual({
                type: 'enabled',
                budget_tokens: expectedBudget,
            })
            expect(capturedPayload.max_tokens).toBe(expectedMaxTokens)
        }

        // Test 'auto' thinking level
        let capturedPayload: any = null
        const mockClient: any = {
            messages: {
                create: async (payload: any) => {
                    capturedPayload = payload
                    return (async function* () {})()
                },
            },
        }

        const provider = anthropicProvider(undefined, undefined, mockClient)
        const stream = provider.stream([{ role: 'user', content: 'hello' }], undefined, undefined, {
            thinkingLevel: 'auto',
        })
        for await (const _chunk of stream) {
            // Intentionally empty: consuming stream generator to capture payload
        }
        expect(capturedPayload.thinking).toEqual({ type: 'adaptive' })
    })

    it('streams text deltas, thinking deltas, tool_use blocks, and usage metadata', async () => {
        const mockClient: any = {
            messages: {
                create: async () => {
                    return (async function* () {
                        yield {
                            type: 'message_start',
                            message: { usage: { input_tokens: 40, output_tokens: 0 } },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 0,
                            delta: { type: 'thinking_delta', thinking: 'Analyzing code' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 0,
                            delta: { type: 'thinking_delta', thinking: '...' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 1,
                            delta: { type: 'text_delta', text: 'Output:' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 1,
                            delta: { type: 'text_delta', text: ' Done' },
                        }
                        yield {
                            type: 'content_block_start',
                            index: 2,
                            content_block: { id: 'call_1', name: 'read_file', type: 'tool_use' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 2,
                            delta: { type: 'input_json_delta', partial_json: '{"path":"a.ts"}' },
                        }
                        yield {
                            type: 'message_delta',
                            usage: { output_tokens: 15 },
                        }
                    })()
                },
            },
        }

        const provider = anthropicProvider(undefined, undefined, mockClient)
        const stream = provider.stream([{ role: 'user', content: 'run' }])

        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(chunks).toEqual([
            { type: 'thinking_delta', text: 'Analyzing code' },
            { type: 'thinking_delta', text: '...' },
            { type: 'text', text: 'Output:' },
            { type: 'text', text: ' Done' },
            { type: 'tool_call_delta', id: 'call_1', name: 'read_file', inputDelta: '' },
            { type: 'tool_call_delta', id: 'call_1', inputDelta: '{"path":"a.ts"}' },
            { type: 'usage', promptTokens: 40, completionTokens: 15 },
        ])
    })
})
