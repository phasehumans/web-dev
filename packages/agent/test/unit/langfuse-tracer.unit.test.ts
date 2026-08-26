import { describe, it, expect } from 'bun:test'

import { LangfuseTracer } from '../../src/telemetry/langfuse-tracer'

describe('LangfuseTracer (Unit)', () => {
    it('executes full trace lifecycle with mock client', async () => {
        const generations: any[] = []
        const spans: any[] = []
        let traceUpdated = false
        let flushed = false

        const mockSpan = {
            generation: (gen: any) => {
                generations.push(gen)
                return gen
            },
            span: (s: any) => {
                spans.push(s)
                return s
            },
            end: () => {},
        }

        const mockTrace = {
            span: (_spanData: any) => mockSpan,
            update: () => {
                traceUpdated = true
            },
        }

        const mockClient: any = {
            trace: (_traceData: any) => mockTrace,
            flushAsync: async () => {
                flushed = true
            },
        }

        const tracer = new LangfuseTracer({
            sessionId: 'test-session-123',
            userId: 'user-456',
            environment: 'development',
            tags: ['test'],
            client: mockClient,
        })

        tracer.startSession('test-session-123', { custom: 'value' })
        tracer.startTurn(1)
        tracer.recordGeneration({
            model: 'gemini-3.6-flash',
            messages: [{ role: 'user', content: 'hello' }],
            systemPrompt: 'system instructions',
            assistantMessage: 'hello back',
            thinking: 'thought',
            usage: { promptTokens: 15, completionTokens: 5, totalTokens: 20 },
            durationMs: 120,
        })
        tracer.recordToolExecution({
            toolCallId: 'tc-999',
            toolName: 'read_file',
            input: { path: 'test.txt' },
            output: 'test content',
            durationMs: 10,
        })
        tracer.endTurn(1)
        tracer.endSession('COMPLETED')
        await tracer.flush()

        expect(generations.length).toBe(1)
        expect(generations[0].model).toBe('gemini-3.6-flash')
        expect(generations[0].output).toBe('hello back')
        expect(spans.length).toBe(1)
        expect(spans[0].name).toBe('tool:read_file')
        expect(traceUpdated).toBe(true)
        expect(flushed).toBe(true)
    })
})
