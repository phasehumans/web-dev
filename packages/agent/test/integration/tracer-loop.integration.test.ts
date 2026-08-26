import { describe, it, expect } from 'bun:test'

import { Agent } from '../../src/agent'
import { runAgentLoop } from '../../src/agent-loop'
import { MockLLM } from '../mock-provider'

import type { PlatformAdapter } from '../../src/platform-adapter'
import type {
    AgentTracer,
    GenerationTraceData,
    ToolTraceData,
} from '../../src/telemetry/tracer.types'

class MockTracer implements AgentTracer {
    public sessionsStarted: { sessionId: string; metadata?: Record<string, any> }[] = []
    public turnsStarted: number[] = []
    public generationsRecorded: GenerationTraceData[] = []
    public toolsRecorded: ToolTraceData[] = []
    public turnsEnded: { turnIndex: number; metadata?: Record<string, any> }[] = []
    public sessionsEnded: { status: 'COMPLETED' | 'FAILED' | 'ABORTED'; error?: string }[] = []
    public flushCalls = 0

    startSession(sessionId: string, metadata?: Record<string, any>): void {
        this.sessionsStarted.push({ sessionId, metadata })
    }

    startTurn(turnIndex: number): void {
        this.turnsStarted.push(turnIndex)
    }

    recordGeneration(data: GenerationTraceData): void {
        this.generationsRecorded.push(data)
    }

    recordToolExecution(data: ToolTraceData): void {
        this.toolsRecorded.push(data)
    }

    endTurn(turnIndex: number, metadata?: Record<string, any>): void {
        this.turnsEnded.push({ turnIndex, metadata })
    }

    endSession(status: 'COMPLETED' | 'FAILED' | 'ABORTED', error?: string): void {
        this.sessionsEnded.push({ status, error })
    }

    async flush(): Promise<void> {
        this.flushCalls++
    }
}

class FaultyTracer implements AgentTracer {
    startSession(): void {
        throw new Error('Telemetry network failure')
    }
    startTurn(): void {
        throw new Error('Telemetry turn failure')
    }
    recordGeneration(): void {
        throw new Error('Telemetry generation failure')
    }
    recordToolExecution(): void {
        throw new Error('Telemetry tool failure')
    }
    endTurn(): void {
        throw new Error('Telemetry end turn failure')
    }
    endSession(): void {
        throw new Error('Telemetry end session failure')
    }
    async flush(): Promise<void> {
        throw new Error('Telemetry flush failure')
    }
}

describe('Agent Loop Telemetry Tracer (Integration)', () => {
    const mockPlatformAdapter: PlatformAdapter = {
        readFile: async () => 'file content',
        writeFile: async () => {},
        listFiles: async () => [],
    } as any

    it('records full trace lifecycle in chronological order for simple text response', async () => {
        const tracer = new MockTracer()
        const mockLLM = new MockLLM()
        mockLLM.pushResponse([
            { type: 'thinking_delta', text: 'thinking process...' },
            { type: 'text', text: 'Hello! How can I help you today?' },
            { type: 'usage', promptTokens: 25, completionTokens: 12 },
        ])

        const agent = new Agent({
            sessionId: 'session-trace-1',
            llm: mockLLM,
            tools: [],
            operations: mockPlatformAdapter,
            tracer,
            modelOptions: { model: 'claude-3-7-sonnet' },
        })

        const generator = runAgentLoop(agent, 'Hi')
        const events = []
        for await (const event of generator) {
            events.push(event)
        }

        expect(tracer.sessionsStarted.length).toBe(1)
        expect(tracer.sessionsStarted[0].sessionId).toBe('session-trace-1')
        expect(tracer.sessionsStarted[0].metadata?.model).toBe('claude-3-7-sonnet')

        expect(tracer.turnsStarted).toEqual([1])
        expect(tracer.turnsEnded.length).toBe(1)
        expect(tracer.turnsEnded[0].turnIndex).toBe(1)

        expect(tracer.generationsRecorded.length).toBe(1)
        const gen = tracer.generationsRecorded[0]
        expect(gen.model).toBe('claude-3-7-sonnet')
        expect(gen.assistantMessage).toBe('Hello! How can I help you today?')
        expect(gen.thinking).toBe('thinking process...')
        expect(gen.usage?.promptTokens).toBe(25)
        expect(gen.usage?.completionTokens).toBe(12)
        expect(gen.durationMs).toBeGreaterThanOrEqual(0)

        expect(tracer.sessionsEnded).toEqual([{ status: 'COMPLETED', error: undefined }])
        expect(tracer.flushCalls).toBe(1)
    })

    it('records tool execution spans with input, output, duration, and error status', async () => {
        const tracer = new MockTracer()
        const mockLLM = new MockLLM()
        mockLLM.pushResponse([
            {
                type: 'tool_call',
                toolCall: {
                    id: 'tc-123',
                    name: 'read_file',
                    input: JSON.stringify({ path: 'README.md' }),
                },
            },
        ])
        mockLLM.pushResponse([
            { type: 'text', text: 'I read the file.' },
            { type: 'usage', promptTokens: 40, completionTokens: 8 },
        ])

        const readTool = {
            name: 'read_file',
            description: 'Read file',
            inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
            execute: async (args: any) => `# Mock content for ${args.path}`,
        }

        const agent = new Agent({
            sessionId: 'session-trace-tools',
            llm: mockLLM,
            tools: [readTool],
            operations: mockPlatformAdapter,
            tracer,
        })

        const generator = runAgentLoop(agent, 'Read the readme')
        for await (const _event of generator) {
            // consume stream
        }

        expect(tracer.turnsStarted).toEqual([1, 2])
        expect(tracer.toolsRecorded.length).toBe(1)
        const toolRecord = tracer.toolsRecorded[0]
        expect(toolRecord.toolCallId).toBe('tc-123')
        expect(toolRecord.toolName).toBe('read_file')
        expect(toolRecord.output).toContain('# Mock content for README.md')
        expect(toolRecord.durationMs).toBeGreaterThanOrEqual(0)
        expect(toolRecord.error).toBeUndefined()

        expect(tracer.generationsRecorded.length).toBe(2)
        expect(tracer.sessionsEnded).toEqual([{ status: 'COMPLETED', error: undefined }])
        expect(tracer.flushCalls).toBe(1)
    })

    it('handles tracer exceptions gracefully without crashing the agent loop', async () => {
        const faultyTracer = new FaultyTracer()
        const mockLLM = new MockLLM()
        mockLLM.pushResponse([{ type: 'text', text: 'Agent response despite telemetry errors' }])

        const agent = new Agent({
            sessionId: 'session-faulty-tracer',
            llm: mockLLM,
            tools: [],
            operations: mockPlatformAdapter,
            tracer: faultyTracer,
        })

        const generator = runAgentLoop(agent, 'Hello')
        const events = []
        for await (const event of generator) {
            events.push(event)
        }

        const textEvents = events.filter((e) => e.type === 'StreamChunk')
        expect(textEvents.length).toBe(1)
        expect((textEvents[0] as any).content).toBe('Agent response despite telemetry errors')
    })

    it('records ABORTED session status when signal is aborted mid-turn', async () => {
        const tracer = new MockTracer()
        const mockLLM = new MockLLM()
        mockLLM.pushResponse(() =>
            (async function* () {
                yield { type: 'text' as const, text: 'Chunk 1' }
                await new Promise((resolve) => setTimeout(resolve, 100))
                yield { type: 'text' as const, text: 'Chunk 2' }
            })()
        )

        const agent = new Agent({
            sessionId: 'session-abort-trace',
            llm: mockLLM,
            tools: [],
            operations: mockPlatformAdapter,
            tracer,
        })

        const generator = runAgentLoop(agent, 'Start long run')
        const iterator = generator[Symbol.asyncIterator]()
        await iterator.next() // AgentStart
        await iterator.next() // TurnStart

        // Trigger abort
        agent.activeAbortController?.abort()

        for await (const _event of generator) {
            // drain
        }

        expect(tracer.sessionsEnded).toEqual([{ status: 'ABORTED', error: undefined }])
        expect(tracer.flushCalls).toBe(1)
    })
})
