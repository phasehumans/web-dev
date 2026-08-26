import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { LangfuseTracer } from '../../src/telemetry/langfuse-tracer'
import { NoopTracer } from '../../src/telemetry/noop-tracer'
import { createAgentTracer } from '../../src/telemetry/tracer.factory'

describe('Agent Tracer Factory (Unit)', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
        process.env = { ...originalEnv }
    })

    afterEach(() => {
        process.env = { ...originalEnv }
    })

    it('returns LangfuseTracer for cloud runtime when keys are present', () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-test'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-test'
        process.env.NODE_ENV = 'production'

        const tracer = createAgentTracer({
            runtime: 'cloud',
            sessionId: 'cloud-sess-1',
            userId: 'usr-1',
        })

        expect(tracer).toBeInstanceOf(LangfuseTracer)
    })

    it('returns NoopTracer for cloud runtime when keys are missing', () => {
        delete process.env.LANGFUSE_PUBLIC_KEY
        delete process.env.LANGFUSE_SECRET_KEY

        const tracer = createAgentTracer({
            runtime: 'cloud',
            sessionId: 'cloud-sess-2',
        })

        expect(tracer).toBeInstanceOf(NoopTracer)
    })

    it('returns LangfuseTracer for CLI runtime in development when keys are present', () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-test'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-test'
        process.env.NODE_ENV = 'development'

        const tracer = createAgentTracer({
            runtime: 'cli',
            sessionId: 'cli-dev-sess',
        })

        expect(tracer).toBeInstanceOf(LangfuseTracer)
    })

    it('returns NoopTracer for CLI runtime in production mode (end-user privacy)', () => {
        process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-test'
        process.env.LANGFUSE_SECRET_KEY = 'sk-lf-test'
        process.env.NODE_ENV = 'production'

        const tracer = createAgentTracer({
            runtime: 'cli',
            sessionId: 'cli-user-sess',
        })

        expect(tracer).toBeInstanceOf(NoopTracer)
    })

    it('returns NoopTracer for CLI runtime when keys are missing in development', () => {
        delete process.env.LANGFUSE_PUBLIC_KEY
        delete process.env.LANGFUSE_SECRET_KEY
        process.env.NODE_ENV = 'development'

        const tracer = createAgentTracer({
            runtime: 'cli',
            sessionId: 'cli-dev-no-keys',
        })

        expect(tracer).toBeInstanceOf(NoopTracer)
    })
})
