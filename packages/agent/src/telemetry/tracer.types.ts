export interface GenerationTraceData {
    model?: string
    messages: any[]
    systemPrompt?: string
    assistantMessage: string
    thinking?: string
    usage?: {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
        cacheCreationInputTokens?: number
        cacheReadInputTokens?: number
    }
    durationMs: number
    error?: string
    metadata?: Record<string, any>
}

export interface ToolTraceData {
    toolCallId: string
    toolName: string
    input: any
    output?: string
    error?: string
    durationMs: number
}

export interface AgentTracer {
    startSession(sessionId: string, metadata?: Record<string, any>): void
    startTurn(turnIndex: number): void
    recordGeneration(data: GenerationTraceData): void
    recordToolExecution(data: ToolTraceData): void
    endTurn(turnIndex: number, metadata?: Record<string, any>): void
    endSession(status: 'COMPLETED' | 'FAILED' | 'ABORTED', error?: string): void
    flush(): Promise<void>
}
