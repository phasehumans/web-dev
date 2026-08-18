import { describe, it, expect } from 'bun:test'

import { generateCliSessionName, parseOpenAiChatRequest } from '../../src/modules/cli/cli.utils'

describe('CLI Utils - Unit Tests', () => {
    it('generateCliSessionName should return string prefixed with cli-session-', () => {
        const name = generateCliSessionName()
        expect(name).toBeDefined()
        expect(typeof name).toBe('string')
        expect(name.startsWith('cli-session-')).toBe(true)
    })

    describe('parseOpenAiChatRequest', () => {
        it('extracts system prompt, user messages, assistant tool calls, and tool responses', () => {
            const body = {
                model: 'gemini-3.6-flash',
                temperature: 0.7,
                max_tokens: 4096,
                thinking_level: 'high',
                messages: [
                    { role: 'system', content: 'You are a helpful coding assistant.' },
                    { role: 'user', content: 'Create a task file' },
                    {
                        role: 'assistant',
                        content: '',
                        tool_calls: [
                            {
                                id: 'call_123',
                                function: {
                                    name: 'write_file',
                                    arguments: '{"path":"TASK.md","content":"# Tasks"}',
                                },
                            },
                        ],
                    },
                    {
                        role: 'tool',
                        tool_call_id: 'call_123',
                        content: 'File created successfully',
                    },
                ],
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'write_file',
                            description: 'Write file to disk',
                            parameters: {
                                type: 'object',
                                properties: { path: { type: 'string' } },
                            },
                        },
                    },
                ],
            }

            const parsed = parseOpenAiChatRequest(body)

            expect(parsed.systemPrompt).toBe('You are a helpful coding assistant.')
            expect(parsed.messages).toHaveLength(3)
            expect(parsed.messages[0]).toEqual({
                role: 'user',
                content: 'Create a task file',
            })
            expect(parsed.messages[1]).toEqual({
                role: 'assistant',
                content: '',
                toolCalls: [
                    {
                        id: 'call_123',
                        name: 'write_file',
                        input: '{"path":"TASK.md","content":"# Tasks"}',
                    },
                ],
            })
            expect(parsed.messages[2]).toEqual({
                role: 'tool',
                toolCallId: 'call_123',
                content: 'File created successfully',
            })
            expect(parsed.tools).toHaveLength(1)
            expect(parsed.tools?.[0]?.name).toBe('write_file')
            expect(parsed.modelOptions).toEqual({
                model: 'gemini-3.6-flash',
                temperature: 0.7,
                max_tokens: 4096,
                thinkingLevel: 'high',
            })
        })
    })
})
