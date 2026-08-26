import { Langfuse } from 'langfuse'

import type { AgentTracer, GenerationTraceData, ToolTraceData } from './tracer.types'
import type { LangfuseTraceClient, LangfuseSpanClient } from 'langfuse'

export interface LangfuseTracerOptions {
    sessionId: string
    userId?: string
    publicKey?: string
    secretKey?: string
    baseUrl?: string
    environment?: string
    tags?: string[]
    metadata?: Record<string, any>
    client?: Langfuse
}

export class LangfuseTracer implements AgentTracer {
    private client: Langfuse
    private trace?: LangfuseTraceClient
    private activeTurnSpan?: LangfuseSpanClient
    private options: LangfuseTracerOptions

    constructor(options: LangfuseTracerOptions) {
        this.options = options
        const baseUrl =
            options.baseUrl ||
            process.env.LANGFUSE_BASE_URL ||
            process.env.LANGFUSE_BASEURL ||
            process.env.LANGFUSE_HOST ||
            'https://cloud.langfuse.com'

        this.client =
            options.client ||
            new Langfuse({
                publicKey: options.publicKey || process.env.LANGFUSE_PUBLIC_KEY || '',
                secretKey: options.secretKey || process.env.LANGFUSE_SECRET_KEY || '',
                baseUrl,
                flushAt: 5,
                flushInterval: 500,
            })
    }

    public startSession(sessionId: string, metadata?: Record<string, any>): void {
        try {
            const mergedMetadata = {
                ...this.options.metadata,
                ...metadata,
                environment: this.options.environment || 'development',
            }

            const tags = Array.from(
                new Set([...(this.options.tags || []), this.options.environment || 'development'])
            )

            this.trace = this.client.trace({
                id: sessionId,
                sessionId,
                userId: this.options.userId,
                name: 'agent-session',
                metadata: mergedMetadata,
                tags,
                release: process.env.npm_package_version || '0.3.17',
            })
        } catch {
            // Intentionally swallowed: Langfuse startSession error fallback
        }
    }

    public startTurn(turnIndex: number): void {
        try {
            if (!this.trace) {
                this.startSession(this.options.sessionId)
            }

            if (this.trace) {
                this.activeTurnSpan = this.trace.span({
                    name: `Turn #${turnIndex}`,
                    metadata: { turnIndex },
                    startTime: new Date(),
                })
            }
        } catch {
            // Intentionally swallowed: Langfuse startTurn error fallback
        }
    }

    public recordGeneration(data: GenerationTraceData): void {
        try {
            const parent = this.activeTurnSpan || this.trace
            if (!parent) return

            const startTime = new Date(Date.now() - (data.durationMs || 0))
            const endTime = new Date()

            parent.generation({
                name: 'llm-generation',
                model: data.model,
                modelParameters: data.metadata?.modelOptions,
                input: data.messages,
                output: data.assistantMessage,
                startTime,
                endTime,
                usage: data.usage
                    ? {
                          promptTokens: data.usage.promptTokens,
                          completionTokens: data.usage.completionTokens,
                          totalTokens: data.usage.totalTokens,
                      }
                    : undefined,
                metadata: {
                    systemPrompt: data.systemPrompt,
                    thinking: data.thinking,
                    error: data.error,
                    cacheCreationInputTokens: data.usage?.cacheCreationInputTokens,
                    cacheReadInputTokens: data.usage?.cacheReadInputTokens,
                },
                level: data.error ? 'ERROR' : 'DEFAULT',
                statusMessage: data.error,
            })
        } catch {
            // Intentionally swallowed: Langfuse recordGeneration error fallback
        }
    }

    public recordToolExecution(data: ToolTraceData): void {
        try {
            const parent = this.activeTurnSpan || this.trace
            if (!parent) return

            const startTime = new Date(Date.now() - (data.durationMs || 0))
            const endTime = new Date()

            parent.span({
                name: `tool:${data.toolName}`,
                input: data.input,
                output: data.output,
                startTime,
                endTime,
                metadata: {
                    toolCallId: data.toolCallId,
                    durationMs: data.durationMs,
                    error: data.error,
                },
                level: data.error ? 'ERROR' : 'DEFAULT',
                statusMessage: data.error ? 'ERROR' : 'OK',
            })
        } catch {
            // Intentionally swallowed: Langfuse recordToolExecution error fallback
        }
    }

    public endTurn(turnIndex: number, metadata?: Record<string, any>): void {
        try {
            if (this.activeTurnSpan) {
                this.activeTurnSpan.end({
                    metadata: { turnIndex, ...metadata },
                })
                this.activeTurnSpan = undefined
            }
        } catch {
            // Intentionally swallowed: Langfuse endTurn error fallback
        }
    }

    public endSession(status: 'COMPLETED' | 'FAILED' | 'ABORTED', error?: string): void {
        try {
            if (this.trace) {
                this.trace.update({
                    metadata: { status, error },
                    tags: Array.from(new Set([...(this.options.tags || []), status.toLowerCase()])),
                })
            }
        } catch {
            // Intentionally swallowed: Langfuse endSession error fallback
        }
    }

    public async flush(): Promise<void> {
        try {
            const flushPromise = this.client.flushAsync()
            const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1500))
            await Promise.race([flushPromise, timeoutPromise])
        } catch {
            // Intentionally swallowed: Langfuse async flush error fallback
        }
    }

    public getClient(): Langfuse {
        return this.client
    }
}
