export interface EvalTask {
    id: string
    name: string
    description: string
    prompt: string
    workspaceSnapshot?: string
    validationScript: string
    timeoutMs?: number
    maxTurns?: number
    env?: Record<string, string>
}

export type EvalStatus = 'PASS' | 'FAIL' | 'ERROR' | 'TIMEOUT'

export interface TokenUsage {
    promptTokens: number
    completionTokens: number
    totalTokens: number
}

export interface EvalResult {
    taskId: string
    status: EvalStatus
    exitCode: number
    durationMs: number
    tokenUsage: TokenUsage
    trajectoryPath: string
    error?: string
}

export type ExecutionBackend = 'sandbox' | 'local'

export interface RunnerOptions {
    backend: ExecutionBackend
    outputDir?: string
    maxParallel?: number
    env?: Record<string, string>
}
