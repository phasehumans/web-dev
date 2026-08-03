import type { LLMProvider, Message, ProviderTool, ProviderStreamChunk } from './types.ts'

export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'gemini-3.6-flash': 1000000,
    'gemini-3.5-flash': 1000000,
    'gemini-3.5-flash-lite': 1000000,
    'gemini-3-pro-preview': 1000000,
    'gemini-3.1-pro': 1000000,
    'gemini-2.5-pro': 1000000,
    'gemini-2.5-flash': 1000000,
    'claude-fable-5': 200000,
    'claude-opus-5': 200000,
    'claude-sonnet-5': 200000,
    'claude-haiku-4-5-20251001': 200000,
    'claude-3-7-sonnet-latest': 200000,
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-sonnet-latest': 200000,
    'claude-3-5-haiku-latest': 200000,
    'claude-3-haiku-20240307': 200000,
    'gpt-5.6-sol': 200000,
    'gpt-5.6-terra': 200000,
    'gpt-5.6-luna': 200000,
    'gpt-5.5-instant': 128000,
    'gpt-5.4-mini': 128000,
    'o3-mini': 200000,
    o1: 200000,
    'o1-mini': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'deepseek-chat': 128000,
    'deepseek-reasoner': 128000,
}

export function getModelContextWindow(value: string): number {
    if (!value) return 100000
    if (MODEL_CONTEXT_WINDOWS[value]) {
        return MODEL_CONTEXT_WINDOWS[value]
    }
    const lower = value.toLowerCase()
    if (lower.includes('gemini')) return 1000000
    if (lower.includes('claude')) return 200000
    if (lower.includes('o3-mini') || lower.includes('o1')) return 200000
    if (lower.includes('gpt-5')) return 200000
    if (lower.includes('gpt-4.5')) return 128000
    if (lower.includes('gpt-4')) return 128000
    if (lower.includes('gpt-3.5')) return 16385
    if (lower.includes('deepseek')) return 128000
    if (lower.includes('llama-3.3') || lower.includes('llama-3.1')) return 128000
    if (lower.includes('128k')) return 131072
    if (lower.includes('32k')) return 32768
    if (lower.includes('8192')) return 8192
    if (lower.includes('8k')) return 8192
    return 100000
}

export interface ProviderConfig<T> {
    id: string
    name: string
    baseUrl?: string
    auth?: Record<string, string>
    models: any[]
    api: T
}

export function createProvider<T>(
    config: ProviderConfig<T>,
    streamImpl: (
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ) => AsyncGenerator<ProviderStreamChunk, void, unknown>
): LLMProvider {
    return {
        id: config.id,
        stream: streamImpl,
    }
}
