import type { AgentTracer, GenerationTraceData, ToolTraceData } from './tracer.types'

export class NoopTracer implements AgentTracer {
    startSession(_sessionId: string, _metadata?: Record<string, any>): void {
        // Intentionally empty: No-op tracer for production CLI end-users
    }

    startTurn(_turnIndex: number): void {
        // Intentionally empty
    }

    recordGeneration(_data: GenerationTraceData): void {
        // Intentionally empty
    }

    recordToolExecution(_data: ToolTraceData): void {
        // Intentionally empty
    }

    endTurn(_turnIndex: number, _metadata?: Record<string, any>): void {
        // Intentionally empty
    }

    endSession(_status: 'COMPLETED' | 'FAILED' | 'ABORTED', _error?: string): void {
        // Intentionally empty
    }

    async flush(): Promise<void> {
        // Intentionally empty
    }
}
