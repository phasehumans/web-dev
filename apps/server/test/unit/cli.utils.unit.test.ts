import { describe, it, expect } from 'bun:test'

import {
    generateCliSessionName,
    parseOpenAiChatRequest,
    reconcileCliMessages,
} from '../../src/modules/cli/cli.utils'

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

    describe('reconcileCliMessages', () => {
        it('handles empty or undefined input gracefully', () => {
            expect(reconcileCliMessages()).toEqual([])
            expect(reconcileCliMessages([])).toEqual([])
        })

        it('reconciles multi-turn CLI messages, attaching tool results into assistant message command blocks', () => {
            const rawCliMessages = [
                { role: 'system', content: 'You are December agent.' },
                { role: 'user', content: 'Create a feature file' },
                {
                    role: 'assistant',
                    content: '',
                    thoughts: 'Let me create feature.ts',
                    toolCalls: [
                        {
                            id: 'tc-1',
                            name: 'write_file',
                            input: { targetFile: 'feature.ts', codeContent: 'export const x = 1;' },
                        },
                    ],
                },
                {
                    role: 'tool',
                    toolCallId: 'tc-1',
                    content: 'File feature.ts created successfully.',
                },
                {
                    role: 'assistant',
                    content: 'I have created feature.ts for you.',
                },
            ]

            const reconciled = reconcileCliMessages(rawCliMessages)

            expect(reconciled).toHaveLength(4)

            // 0: System
            expect(reconciled[0]).toEqual({
                role: 'SYSTEM',
                content: 'You are December agent.',
                sequence: 0,
            })

            // 1: User
            expect(reconciled[1]).toEqual({
                role: 'USER',
                content: 'Create a feature file',
                sequence: 1,
            })

            // 2: Assistant with toolCalls reconciled to command block
            expect(reconciled[2]!.role).toBe('ASSISTANT')
            expect(reconciled[2]!.sequence).toBe(2)
            expect(reconciled[2]!.blocks).toBeDefined()
            expect(reconciled[2]!.blocks).toHaveLength(2) // thinking block + command block
            expect(reconciled[2]!.blocks![0]).toEqual({
                type: 'thinking',
                content: 'Let me create feature.ts',
            })
            expect(reconciled[2]!.blocks![1]).toEqual({
                type: 'command',
                toolCallId: 'tc-1',
                toolName: 'write_file',
                toolInput: { targetFile: 'feature.ts', codeContent: 'export const x = 1;' },
                status: 'success',
                output: 'File feature.ts created successfully.',
            })

            // 3: Assistant final response text
            expect(reconciled[3]!.role).toBe('ASSISTANT')
            expect(reconciled[3]!.content).toBe('I have created feature.ts for you.')
            expect(reconciled[3]!.sequence).toBe(3)
            expect(reconciled[3]!.blocks).toEqual([
                { type: 'text', content: 'I have created feature.ts for you.' },
            ])
        })

        it('marks command block status as error when tool execution fails', () => {
            const rawCliMessages = [
                {
                    role: 'assistant',
                    content: '',
                    toolCalls: [
                        {
                            id: 'tc-fail',
                            name: 'bash',
                            input: 'invalid command',
                        },
                    ],
                },
                {
                    role: 'tool',
                    toolCallId: 'tc-fail',
                    content: 'Tool execution failed: bash error exit code 127',
                },
            ]

            const reconciled = reconcileCliMessages(rawCliMessages)
            expect(reconciled).toHaveLength(1)
            expect(reconciled[0]!.blocks![0]).toEqual({
                type: 'command',
                toolCallId: 'tc-fail',
                toolName: 'bash',
                toolInput: 'invalid command',
                status: 'error',
                output: 'Tool execution failed: bash error exit code 127',
            })
        })
    })
})
