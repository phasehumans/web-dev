export type VerifyWalletBalance = {
    userId: string
}

export type GenerateHandoffUrl = {
    userId: string
}

export type ProxyChatCompletions = {
    userId: string
    body: any
    res: any
}

export type CompleteHandoff = {
    userId: string
    title?: string
    messages?: any[]
    objectKey?: string
}

export type CliHandoffPayload = {
    title?: string
    messages?: any[]
    objectKey?: string
}

export type CreateCliSession = {
    userId: string
    title: string
    messages: any[]
    minioPrefix?: string
}

export type UpstreamDispatchConfig = {
    url: string
    headers: Record<string, string>
    body: Record<string, unknown>
    providerName: 'gemini' | 'openai' | 'deepseek' | 'openrouter'
}
