import { describe, it, expect } from 'vitest'

import { copilotProvider, CopilotProvider, resolveCopilotModel } from '../../src/providers/copilot'

describe('Copilot Provider (Unit)', () => {
    it('resolves model aliases correctly', () => {
        expect(resolveCopilotModel('copilot/claude-3.7-sonnet')).toBe('claude-3.7-sonnet')
        expect(resolveCopilotModel('claude-3.5-sonnet')).toBe('claude-3.5-sonnet')
        expect(resolveCopilotModel('gpt-4o')).toBe('gpt-4o')
        expect(resolveCopilotModel()).toBe('claude-3.7-sonnet')
    })

    it('instantiates CopilotProvider class wrapper and LLMProvider correctly', () => {
        const p1 = copilotProvider('test-copilot-token')
        expect(p1.id).toBe('copilot')
        expect(typeof p1.stream).toBe('function')

        const p2 = new CopilotProvider('test-copilot-token')
        expect(p2.id).toBe('copilot')
        expect(typeof p2.stream).toBe('function')
    })

    it('transforms model options and streams correctly with mock client', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            chat: {
                completions: {
                    create: async (payload: any) => {
                        capturedPayload = payload
                        return (async function* () {
                            yield {
                                usage: { prompt_tokens: 25, completion_tokens: 15 },
                            }
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            reasoning_content: 'Let me think...',
                                            content: 'Hello from Copilot!',
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
                                                    id: 'call_abc123',
                                                    function: {
                                                        name: 'bash',
                                                        arguments: '{"cmd":"ls"}',
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
            },
        }

        const provider = copilotProvider('mock-copilot-token', {
            customClient: mockClient,
            integrationId: 'vscode-chat',
        })

        const stream = provider.stream(
            [{ role: 'user', content: 'Say hi' }],
            undefined,
            'You are a helpful assistant',
            { model: 'copilot/claude-3.7-sonnet' }
        )

        const chunks = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedPayload.model).toBe('claude-3.7-sonnet')
        expect(capturedPayload.stream).toBe(true)
        expect(capturedPayload.messages[0]).toEqual({
            role: 'system',
            content: 'You are a helpful assistant',
        })
        expect(capturedPayload.messages[1]).toEqual({
            role: 'user',
            content: 'Say hi',
        })

        expect(chunks).toContainEqual({
            type: 'thinking_delta',
            text: 'Let me think...',
        })
        expect(chunks).toContainEqual({
            type: 'text',
            text: 'Hello from Copilot!',
        })
        expect(chunks).toContainEqual({
            type: 'tool_call_delta',
            id: 'call_abc123',
            name: 'bash',
            inputDelta: '{"cmd":"ls"}',
        })
        expect(chunks).toContainEqual({
            type: 'usage',
            promptTokens: 25,
            completionTokens: 15,
        })
    })
})
