import type { HandlePromptDto } from './core.schema'

export type { HandlePromptDto }

export type ProcessPromptJob = {
    userId: string
    prompt: string
    projectId?: string
    sessionId?: string
}

export type PromptJobData = {
    prompt: string
    projectId?: string
    sessionId?: string
    userId: string
}

export type ProcessPromptJobResult = {
    jobId: string
    sessionId: string
}
