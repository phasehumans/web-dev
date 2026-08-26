export type GetCurrentUsage = {
    userId: string
}

export type CheckEnoughCredits = {
    userId: string
    estimatedCostInCents?: number
}

export type HasMinimumBalance = {
    userId: string
    minBalanceInCents?: number
}

export type RecordUsageEvent = {
    userId: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costInCents?: number
    sessionId?: string
    chatId?: string
    externalRequestId?: string
    metadata?: Record<string, unknown>
}

export type CalculateGenerationCost = {
    modelName: string
    inputTokens: number
    outputTokens: number
}

export type CanRunSelfCorrection = {
    userId: string
}

export type UsageUser = {
    id: string
    isDeleted: boolean
    createdAt: Date
    creditBalance: number
}

export type ModelRate = {
    name: string
    inputRate: number // usd per 1m tokens
    outputRate: number // usd per 1m tokens
}
