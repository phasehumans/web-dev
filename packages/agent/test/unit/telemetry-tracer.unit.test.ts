import { describe, it, expect } from 'bun:test'

import { NoopTracer } from '../../src/telemetry/noop-tracer'

import type { AgentTracer } from '../../src/telemetry/tracer.types'

describe('Telemetry Tracer (Unit)', () => {
    it('NoopTracer implements AgentTracer interface with zero side-effects', async () => {
        const tracer: AgentTracer = new NoopTracer()

        expect(() => {
            tracer.startSession('session-123', { user: 'test' })
            tracer.startTurn(1)
            tracer.recordGeneration({
                model: 'gemini-3.6-flash',
                messages: [{ role: 'user', content: 'hello' }],
                systemPrompt: 'system',
                assistantMessage: 'hi',
                thinking: 'thinking',
                usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
                durationMs: 200,
            })
            tracer.recordToolExecution({
                toolCallId: 'call-1',
                toolName: 'read_file',
                input: { path: 'index.ts' },
                output: 'contents',
                durationMs: 15,
            })
            tracer.endTurn(1)
            tracer.endSession('COMPLETED')
        }).not.toThrow()

        await expect(tracer.flush()).resolves.toBeUndefined()
    })
})
