import { describe, expect, it, mock } from 'bun:test'

import { runAgentLoop } from '../../src/agent-loop'

import type { Agent } from '../../src/agent'
import type { LLMProvider } from '@december/providers'

describe('Agent Loop Integration', () => {
    it('should handle a basic text response', async () => {
        const mockLlm = {
            stream: mock(async function* () {
                yield { type: 'text', text: 'Hello' }
                yield { type: 'text', text: ' World' }
            }),
        } as unknown as LLMProvider

        const mockAgent = {
            llm: mockLlm,
            systemPrompt: 'System',
            tools: new Map(),
            messages: [{ role: 'system', content: 'System' }],
            addMessage: mock(),
            convertToLlm: (msgs: any[]) => msgs,
            activeAbortController: new AbortController(),
            hooks: {},
            steeringQueue: { length: 0, drain: () => [] },
            followUpQueue: { length: 0, drain: () => [] },
            conversation: { compactIfNeeded: async () => ({ compacted: false }) },
            saveContext: async () => {},
            operations: {},
        } as unknown as Agent

        const stream = runAgentLoop(mockAgent, 'Test user prompt')
        const events = []
        for await (const event of stream) {
            events.push(event)
        }

        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'StreamChunk', content: 'Hello' }),
                expect.objectContaining({ type: 'StreamChunk', content: ' World' }),
            ])
        )

        expect(mockAgent.addMessage).toHaveBeenCalledTimes(2)
    })

    it('should handle a tool call execution loop', async () => {
        const mockTool = {
            name: 'mock_tool',
            description: 'A mock tool',
            inputSchema: { type: 'object', properties: {} },
            execute: mock(async () => ({ result: 'Tool success' })),
        }

        const mockTools = new Map([['mock_tool', mockTool]])

        let pass = 0
        const mockLlm = {
            stream: mock(async function* () {
                if (pass === 0) {
                    pass++
                    yield { type: 'text', text: 'I will use a tool' }
                    yield {
                        type: 'tool_call_delta',
                        id: 'tc-123',
                        name: 'mock_tool',
                        inputDelta: '{}',
                    }
                } else {
                    yield { type: 'text', text: 'Done using tool.' }
                }
            }),
        } as unknown as LLMProvider

        const mockAgent = {
            llm: mockLlm,
            systemPrompt: 'System',
            tools: mockTools,
            messages: [{ role: 'system', content: 'System' }],
            addMessage: mock((msg) => {
                mockAgent.messages.push(msg)
            }),
            convertToLlm: (msgs: any[]) => msgs,
            activeAbortController: new AbortController(),
            hooks: {},
            steeringQueue: { length: 0, drain: () => [] },
            followUpQueue: { length: 0, drain: () => [] },
            conversation: { compactIfNeeded: async () => ({ compacted: false }) },
            saveContext: async () => {},
            operations: {},
        } as unknown as Agent

        const stream = runAgentLoop(mockAgent, 'Do it')
        const events = []
        for await (const event of stream) {
            events.push(event)
        }

        expect(mockTool.execute).toHaveBeenCalledTimes(1)
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'ToolCallStart',
                    toolCall: expect.objectContaining({ name: 'mock_tool' }),
                }),
                expect.objectContaining({
                    type: 'ToolCallResult',
                    result: expect.objectContaining({
                        result: expect.objectContaining({ result: 'Tool success' }),
                    }),
                }),
            ])
        )
    })

    it('should gracefully handle API errors and retry or fail', async () => {
        const mockLlm = {
            stream: mock(async function* () {
                yield { type: 'text', text: 'API Error: failed' } as any
                throw new Error('API failed heavily')
            }),
        } as unknown as LLMProvider

        const mockAgent = {
            llm: mockLlm,
            systemPrompt: 'System',
            tools: new Map(),
            messages: [{ role: 'system', content: 'System' }],
            addMessage: mock(),
            convertToLlm: (msgs: any[]) => msgs,
            activeAbortController: new AbortController(),
            hooks: {},
            steeringQueue: { length: 0, drain: () => [] },
            followUpQueue: { length: 0, drain: () => [] },
            conversation: { compactIfNeeded: async () => ({ compacted: false }) },
            saveContext: async () => {},
            operations: {},
        } as unknown as Agent

        const stream = runAgentLoop(mockAgent)
        const events = []
        for await (const event of stream) {
            events.push(event)
        }

        const hasErrorChunk = events.some(
            (e) => e.type === 'StreamChunk' && e.content.includes('API Error')
        )
        expect(hasErrorChunk).toBe(true)
    })

    it('hooks should operate correctly in loop', async () => {
        const mockLlm = {
            stream: mock(async function* () {
                yield { type: 'text', text: 'Loop' }
            }),
        } as unknown as LLMProvider

        const hooks = {
            getSteeringMessages: mock(async () => [{ role: 'user', content: 'steer' }]),
            shouldStopAfterTurn: mock(async () => true),
        }

        const mockAgent = {
            llm: mockLlm,
            systemPrompt: 'System',
            tools: new Map(),
            messages: [{ role: 'system', content: 'System' }],
            steer: mock(),
            addMessage: mock(),
            convertToLlm: (msgs: any[]) => msgs,
            activeAbortController: new AbortController(),
            hooks: hooks,
            steeringQueue: { length: 0, drain: () => [] },
            followUpQueue: { length: 0, drain: () => [] },
            conversation: { compactIfNeeded: async () => ({ compacted: false }) },
            saveContext: async () => {},
            operations: {},
        } as unknown as Agent

        const stream = runAgentLoop(mockAgent)
        const events = []
        for await (const event of stream) {
            events.push(event)
        }

        expect(hooks.getSteeringMessages).toHaveBeenCalled()
        expect(mockAgent.steer).toHaveBeenCalled()
        expect(hooks.shouldStopAfterTurn).toHaveBeenCalled()
    })

    it('should execute tools sequentially when required', async () => {
        const mockTool1 = {
            name: 'bash',
            description: 'seq tool',
            inputSchema: { type: 'object', properties: {} },
            execute: mock(async () => {
                await new Promise((r) => setTimeout(r, 10))
                return 'bash result'
            }),
        }
        const mockTool2 = {
            name: 'write_file',
            description: 'seq tool',
            inputSchema: { type: 'object', properties: {} },
            execute: mock(async () => {
                return 'write result'
            }),
        }

        const mockTools = new Map([
            ['bash', mockTool1],
            ['write_file', mockTool2],
        ])

        const mockLlm = {
            stream: mock(async function* () {
                yield {
                    type: 'tool_call',
                    toolCall: { id: 'tc-1', name: 'bash', input: '{}' },
                }
                yield {
                    type: 'tool_call',
                    toolCall: { id: 'tc-2', name: 'write_file', input: '{}' },
                }
            }),
        } as unknown as LLMProvider

        const hooks = {
            shouldStopAfterTurn: mock(async () => true),
        }

        const mockAgent = {
            llm: mockLlm,
            systemPrompt: 'System',
            tools: mockTools,
            messages: [{ role: 'system', content: 'System' }],
            addMessage: mock(),
            convertToLlm: (msgs: any[]) => msgs,
            activeAbortController: new AbortController(),
            hooks: hooks,
            steeringQueue: { length: 0, drain: () => [] },
            followUpQueue: { length: 0, drain: () => [] },
            conversation: { compactIfNeeded: async () => ({ compacted: false }) },
            saveContext: async () => {},
            operations: {},
        } as unknown as Agent

        const stream = runAgentLoop(mockAgent, 'Run multiple')
        const events = []
        for await (const event of stream) {
            events.push(event)
        }

        expect(mockTool1.execute).toHaveBeenCalledTimes(1)
        expect(mockTool2.execute).toHaveBeenCalledTimes(1)

        const resultEvents = events.filter((e: any) => e.type === 'ToolCallResult')
        expect(resultEvents.length).toBe(2)
    })
})
