import { describe, expect, it, mock } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'
import { MockLLM } from '../mock-provider'

describe('Agent Loop Integration', () => {
    it('should handle a basic text response', async () => {
        const mockLlm = new MockLLM()
        mockLlm.pushResponse([
            { type: 'text', text: 'Hello' },
            { type: 'text', text: ' World' },
        ])

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Test user prompt')) {
            events.push(event)
        }

        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'AgentStart' }),
                expect.objectContaining({ type: 'TurnStart' }),
                expect.objectContaining({ type: 'StreamChunk', content: 'Hello' }),
                expect.objectContaining({ type: 'StreamChunk', content: ' World' }),
                expect.objectContaining({ type: 'TurnEnd' }),
                expect.objectContaining({ type: 'AgentEnd' }),
            ])
        )

        expect(agent.messages.length).toBe(3) // system, user, assistant
        expect(agent.messages[2]!.content).toBe('Hello World')
    })

    it('should handle tool call execution with stream updates and prepareArguments', async () => {
        const mockTool = {
            name: 'custom_tool',
            description: 'A custom tool',
            inputSchema: { type: 'object' },
            prepareArguments: mock((args: any) => ({ ...args, prepared: true })),
            execute: mock(async (args: any, context: any) => {
                context.onStream('chunk 1\n')
                context.onStream('chunk 2\n')
                return `Executed with prepared=${args.prepared}`
            }),
        }

        const mockLlm = new MockLLM()
        // Pass 1: generate tool call delta
        mockLlm.pushResponse([
            { type: 'text', text: 'Calling custom_tool' },
            {
                type: 'tool_call_delta',
                id: 'tc-101',
                name: 'custom_tool',
                inputDelta: '{"val":123}',
            },
        ])
        // Pass 2: final answer after tool completion
        mockLlm.pushResponse([{ type: 'text', text: 'Done.' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [mockTool],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Run tool')) {
            events.push(event)
        }

        expect(mockTool.prepareArguments).toHaveBeenCalledWith({ val: 123 })
        expect(mockTool.execute).toHaveBeenCalled()

        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'ToolCallStart' }),
                expect.objectContaining({
                    type: 'ToolExecutionUpdate',
                    toolCallId: 'tc-101',
                    chunk: 'chunk 1\n',
                }),
                expect.objectContaining({
                    type: 'ToolExecutionUpdate',
                    toolCallId: 'tc-101',
                    chunk: 'chunk 2\n',
                }),
                expect.objectContaining({ type: 'ToolCallResult' }),
            ])
        )

        // Agent history should have system, user, assistant(toolCalls), tool(result), assistant(final)
        expect(agent.messages.length).toBe(5)
        expect(agent.messages[3]!.role).toBe('tool')
        expect(agent.messages[3]!.content).toBe('Executed with prepared=true')
    })

    it('should block tool execution when UI permission hook returns block=true', async () => {
        const mockTool = {
            name: 'blocked_tool',
            description: 'Dangerous tool',
            inputSchema: { type: 'object' },
            execute: mock(async () => 'Should not run'),
        }

        const mockLlm = new MockLLM()
        mockLlm.pushResponse([
            { type: 'tool_call', toolCall: { id: 'tc-block', name: 'blocked_tool', input: '{}' } },
        ])
        mockLlm.pushResponse([{ type: 'text', text: 'Handled block.' }])

        const operations: any = {
            ui: {
                requestPermission: mock(async () => ({
                    block: true,
                    reason: 'Security Policy Violation',
                })),
            },
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [mockTool],
            operations,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Do dangerous thing')) {
            events.push(event)
        }

        expect(mockTool.execute).not.toHaveBeenCalled()
        expect(operations.ui.requestPermission).toHaveBeenCalled()

        const toolResultMsg = agent.messages.find((m) => m.role === 'tool')
        expect(toolResultMsg?.content).toContain(
            'Tool execution blocked: Security Policy Violation'
        )
    })

    it('should mutate tool result when hooks.afterToolCall is provided', async () => {
        const mockTool = {
            name: 'my_tool',
            description: 'My tool',
            inputSchema: {},
            execute: mock(async () => 'Original Result'),
        }

        const mockLlm = new MockLLM()
        mockLlm.pushResponse([
            { type: 'tool_call', toolCall: { id: 'tc-hook', name: 'my_tool', input: '{}' } },
        ])
        mockLlm.pushResponse([{ type: 'text', text: 'All set.' }])

        const hooks = {
            afterToolCall: mock(async (toolCall: any, toolResult: any) => ({
                result: 'Mutated Result',
            })),
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [mockTool],
            operations: {} as any,
            hooks,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Run hook tool')) {
            events.push(event)
        }

        expect(hooks.afterToolCall).toHaveBeenCalled()
        const toolMsg = agent.messages.find((m) => m.role === 'tool')
        expect(toolMsg?.content).toBe('Mutated Result')
    })

    it('should execute tools sequentially when tool name is bash or write_file', async () => {
        const executionOrder: string[] = []

        const bashTool = {
            name: 'bash',
            description: 'bash',
            inputSchema: {},
            execute: mock(async () => {
                executionOrder.push('bash-start')
                await new Promise((r) => setTimeout(r, 20))
                executionOrder.push('bash-end')
                return 'bash output'
            }),
        }

        const editFileTool = {
            name: 'write_file',
            description: 'write_file',
            inputSchema: {},
            execute: mock(async () => {
                executionOrder.push('write-start')
                executionOrder.push('write-end')
                return 'write output'
            }),
        }

        const mockLlm = new MockLLM()
        mockLlm.pushResponse([
            { type: 'tool_call', toolCall: { id: 'tc-1', name: 'bash', input: '{}' } },
            { type: 'tool_call', toolCall: { id: 'tc-2', name: 'write_file', input: '{}' } },
        ])
        mockLlm.pushResponse([{ type: 'text', text: 'Sequential done.' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [bashTool, editFileTool],
            operations: {} as any,
        })

        for await (const _ of runAgentLoop(agent, 'Run sequential')) {
            // Intentionally empty: consuming stream to completion
        }

        expect(executionOrder).toEqual(['bash-start', 'bash-end', 'write-start', 'write-end'])
    })

    it('should retry on HTTP 429 rate limits and emit AgentStatus warning events with newline', async () => {
        const mockLlm = new MockLLM()
        const rateLimitErr: any = new Error('429 Too Many Requests')
        rateLimitErr.status = 429

        mockLlm.pushResponse(rateLimitErr)
        mockLlm.pushResponse([{ type: 'text', text: 'Success after retry' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Test 429 retry')) {
            events.push(event)
        }

        expect(mockLlm.calls.length).toBe(2)
        const statusEvent = events.find((e) => e.type === 'AgentStatus' && e.message)
        expect(statusEvent).toBeDefined()
        expect((statusEvent as any).message).toContain('Rate limit hit')
        expect((statusEvent as any).message).not.toContain('high demand')
        expect((statusEvent as any).message.endsWith('\n')).toBe(true)
        expect(
            events.some((e) => e.type === 'StreamChunk' && e.content === 'Success after retry')
        ).toBe(true)
    }, 10000)

    it('should retry on HTTP 503 high demand and emit AgentStatus high demand event with newline', async () => {
        const mockLlm = new MockLLM()
        const highDemandErr: any = new Error('503 Service Unavailable')
        highDemandErr.status = 503

        mockLlm.pushResponse(highDemandErr)
        mockLlm.pushResponse([{ type: 'text', text: 'Success after 503 retry' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Test 503 retry')) {
            events.push(event)
        }

        expect(mockLlm.calls.length).toBe(2)
        const statusEvent = events.find((e) => e.type === 'AgentStatus' && e.message)
        expect(statusEvent).toBeDefined()
        expect((statusEvent as any).message).toContain('High demand hit')
        expect((statusEvent as any).message).not.toContain('Rate limit')
        expect((statusEvent as any).message.endsWith('\n')).toBe(true)
    }, 10000)

    it('should include billing CTA link when 402 insufficient credits error is raised', async () => {
        const mockLlm = new MockLLM()
        const creditsErr: any = new Error('Insufficient credits in December Wallet')
        creditsErr.status = 402

        mockLlm.pushResponse(creditsErr)

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Test 402 error')) {
            events.push(event)
        }

        const errEvent = events.find((e) => e.type === 'AgentError')
        expect(errEvent).toBeDefined()
        expect((errEvent as any).error).toContain('https://trydecember.com/settings/billing')
    })

    it('should include pricing CTA link when 429 rate limit is exhausted', async () => {
        const mockLlm = new MockLLM()
        const rateLimitErr: any = new Error('429 Too Many Requests')
        rateLimitErr.status = 429

        for (let i = 0; i < 6; i++) {
            mockLlm.pushResponse(rateLimitErr)
        }

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const events = []
        for await (const event of runAgentLoop(agent, 'Test 429 exhaustion')) {
            events.push(event)
        }

        const errEvent = events.find((e) => e.type === 'AgentError')
        expect(errEvent).toBeDefined()
        expect((errEvent as any).error).toContain('https://trydecember.com/pricing')
    }, 65000)

    it('should emit AgentInterrupt when aborted during execution loop', async () => {
        const mockLlm = new MockLLM()
        mockLlm.pushResponse(async function* () {
            yield { type: 'text', text: 'Starting response...' }
            // Simulating abort mid-stream
            const err: any = new Error('Aborted')
            err.name = 'AbortError'
            throw err
        })

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        const controller = new AbortController()

        const events = []
        const loopPromise = (async () => {
            for await (const event of runAgentLoop(agent, 'Interrupt me')) {
                events.push(event)
                if (event.type === 'StreamChunk') {
                    agent.abort()
                }
            }
        })()

        await loopPromise

        expect(events.some((e) => e.type === 'AgentInterrupt')).toBe(true)
        const lastMsg = agent.messages[agent.messages.length - 1]
        expect(lastMsg?.content).toContain('Interrupted')
    })

    it('should drain follow-up queue across outer loop iterations', async () => {
        const mockLlm = new MockLLM()
        mockLlm.pushResponse([{ type: 'text', text: 'Turn 1 done.' }])
        mockLlm.pushResponse([{ type: 'text', text: 'Turn 2 follow-up done.' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
            followUpMode: 'all',
        })

        agent.followUp({ role: 'user', content: 'Follow up task' })

        const events = []
        for await (const event of runAgentLoop(agent, 'Initial task')) {
            events.push(event)
        }

        const turnStartEvents = events.filter((e) => e.type === 'TurnStart')
        expect(turnStartEvents.length).toBe(2)
        expect(agent.messages.some((m) => m.content === 'Follow up task')).toBe(true)
        expect(agent.messages.some((m) => m.content === 'Turn 2 follow-up done.')).toBe(true)
    })

    it('should process steering queue messages before requesting LLM completion', async () => {
        const mockLlm = new MockLLM()
        mockLlm.pushResponse([{ type: 'text', text: 'Steered response.' }])

        const agent = new Agent({
            llm: mockLlm,
            tools: [],
            operations: {} as any,
        })

        agent.steer({ role: 'user', content: 'Steer direction mid-run' })

        const events = []
        for await (const event of runAgentLoop(agent, 'Start run')) {
            events.push(event)
        }

        expect(
            mockLlm.calls[0]!.messages.some((m) => m.content === 'Steer direction mid-run')
        ).toBe(true)
    })
})
