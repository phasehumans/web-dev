import { LangfuseTracer } from './langfuse-tracer'
import { NoopTracer } from './noop-tracer'

import type { AgentTracer } from './tracer.types'

export interface CreateAgentTracerOptions {
    runtime: 'cloud' | 'cli'
    sessionId: string
    userId?: string
    environment?: string
    workspaceDir?: string
    metadata?: Record<string, any>
    tags?: string[]
    publicKey?: string
    secretKey?: string
    baseUrl?: string
}

export function createAgentTracer(options: CreateAgentTracerOptions): AgentTracer {
    const isDev =
        process.env.NODE_ENV === 'development' ||
        process.env.DECEMBER_DEV_TELEMETRY === 'true' ||
        process.env.NODE_ENV === 'test'

    const publicKey = options.publicKey || process.env.LANGFUSE_PUBLIC_KEY
    const secretKey = options.secretKey || process.env.LANGFUSE_SECRET_KEY
    const baseUrl =
        options.baseUrl ||
        process.env.LANGFUSE_BASE_URL ||
        process.env.LANGFUSE_BASEURL ||
        process.env.LANGFUSE_HOST ||
        'https://cloud.langfuse.com'

    // Case 1: Cloud Agent -> Enabled in both Production and Development if keys exist
    if (options.runtime === 'cloud') {
        if (!publicKey || !secretKey) {
            return new NoopTracer()
        }
        return new LangfuseTracer({
            sessionId: options.sessionId,
            userId: options.userId,
            publicKey,
            secretKey,
            baseUrl,
            environment:
                options.environment ||
                (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
            tags: ['cloud', ...(options.tags || [])],
            metadata: {
                ...options.metadata,
                workspaceDir: options.workspaceDir,
            },
        })
    }

    // Case 2: Terminal CLI -> Enabled ONLY in development when keys are present
    if (options.runtime === 'cli' && isDev && publicKey && secretKey) {
        return new LangfuseTracer({
            sessionId: options.sessionId,
            userId: options.userId || 'local-dev-user',
            publicKey,
            secretKey,
            baseUrl,
            environment: options.environment || 'development',
            tags: ['cli', 'development', ...(options.tags || [])],
            metadata: {
                ...options.metadata,
                workspaceDir: options.workspaceDir,
            },
        })
    }

    // Case 3: Terminal CLI -> Production End-Users (Zero remote network calls)
    return new NoopTracer()
}
