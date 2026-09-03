import type { LLMProvider, Message, ProviderTool, ProviderStreamChunk } from './types.ts'

export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'gemini-3.8-flash': 1000000,
    'gemini-3.7-flash': 1000000,
    'gemini-3.6-flash': 1000000,
    'gemini-3.5-flash': 1000000,
    'gemini-3.5-flash-lite': 1000000,
    'gemini-3.1-pro-preview': 1000000,
    'gemini-3.1-flash-lite': 1000000,
    'gemini-3-pro-preview': 1000000,
    'gemini-2.5-pro': 1000000,
    'gemini-2.5-flash': 1000000,
    'gemini-2.5-flash-lite': 1000000,
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
    'claude-opus-5': 1000000,
    'claude-sonnet-5': 1000000,
    'claude-fable-5-1': 1000000,
    'claude-fable-5.1': 1000000,
    'claude-fable-5': 1000000,
    'claude-haiku-4.5': 200000,
    'claude-haiku-4-5': 200000,
    'claude-opus-4.8': 1000000,
    'claude-opus-4-8': 1000000,
    'claude-opus-4.7': 200000,
    'claude-opus-4-7': 200000,
    'claude-sonnet-4.6': 200000,
    'claude-sonnet-4-6': 200000,
    'claude-opus-4.6': 200000,
    'claude-opus-4-6': 200000,
    'claude-opus-4.5': 200000,
    'claude-opus-4-5': 200000,
    'claude-sonnet-4.5': 200000,
    'claude-sonnet-4-5': 200000,
    'gpt-5.6-sol': 1050000,
    'gpt-5.6-terra': 1050000,
    'gpt-5.6-luna': 1050000,
    'gpt-5.5-pro': 1050000,
    'gpt-5.5': 1050000,
    'gpt-5.4-pro': 400000,
    'gpt-5.4': 400000,
    'gpt-5.4-mini': 400000,
    'o4-mini': 200000,
    'o3-pro': 200000,
    o3: 200000,
    'o3-mini': 200000,
    'o1-pro': 200000,
    'gpt-4.1': 128000,
    'gpt-4.1-mini': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'deepseek-v4-pro': 1000000,
    'deepseek-v4-flash': 1000000,
    'deepseek-chat': 128000,
    'deepseek-reasoner': 128000,
    'glm-5.3-flash': 1000000,
    'glm-5.3': 1000000,
    'glm-5.2': 1000000,
    'glm-5.1': 1000000,
    'glm-5': 1000000,
    'glm-5-turbo': 1000000,
    'MiniMax-M3': 512000,
    'MiniMax-M2.7': 200000,
    'MiniMax-M2.5': 200000,
    'qwen3.8-max': 1000000,
    'qwen3.8-flash-next': 262144,
    'qwen3.7-max': 1000000,
    'qwen3-coder-30b-a3b-instruct': 262144,
    'grok-4.6': 500000,
    'grok-4.5': 500000,
    'grok-4.3': 500000,
    'grok-4.20': 500000,
    'grok-build-0.1': 500000,
    'sonar-deep-research': 128000,
    'sonar-reasoning-pro': 128000,
    'sonar-pro': 128000,
    sonar: 128000,
    'command-a-plus-05-2026': 256000,
    'command-a-reasoning-08-2025': 256000,
    'command-a-03-2025': 256000,
}

export function getModelContextWindow(value: string): number {
    if (!value) return 100000
    if (MODEL_CONTEXT_WINDOWS[value]) {
        return MODEL_CONTEXT_WINDOWS[value]
    }
    let lower = value.toLowerCase()
    if (lower.startsWith('ollama/')) {
        lower = lower.slice('ollama/'.length)
    }
    if (lower.includes('gemini')) return 1000000
    if (
        lower.includes('claude-5') ||
        lower.includes('opus-5') ||
        lower.includes('sonnet-5') ||
        lower.includes('fable-5') ||
        lower.includes('opus-4.8') ||
        lower.includes('opus-4-8')
    )
        return 1000000
    if (lower.includes('claude')) return 200000
    if (lower.includes('grok')) return 500000
    if (
        lower.includes('codestral') ||
        lower.includes('mistral-large') ||
        lower.includes('devstral') ||
        lower.includes('ministral') ||
        lower.includes('mistral-medium') ||
        lower.includes('mistral-small') ||
        lower.includes('command-a') ||
        lower.includes('qwen3.8-flash-next') ||
        lower.includes('qwen3-coder')
    )
        return 262144
    if (lower.includes('gpt-5.6') || lower.includes('gpt-5.5')) return 1050000
    if (lower.includes('gpt-5.4')) return 400000
    if (lower.includes('gpt-5')) return 200000
    if (lower.includes('o4') || lower.includes('o3') || lower.includes('o1')) return 200000
    if (lower.includes('deepseek-v4')) return 1000000
    if (lower.includes('glm-5')) return 1000000
    if (lower.includes('qwen3.8-max') || lower.includes('qwen3.7-max')) return 1000000
    if (lower.includes('minimax-m3')) return 512000
    if (lower.includes('minimax-m2')) return 200000
    if (lower.includes('gpt-4.5')) return 128000
    if (lower.includes('gpt-4')) return 128000
    if (lower.includes('gpt-3.5')) return 16385
    if (lower.includes('deepseek') || lower.includes('glm')) return 128000
    if (
        lower.includes('llama-4') ||
        lower.includes('llama-3.3') ||
        lower.includes('llama-3.1') ||
        lower.includes('llama3.3') ||
        lower.includes('llama3.1') ||
        lower.includes('mistral-nemo') ||
        lower.includes('gpt-oss') ||
        lower.includes('sonar')
    ) {
        return 128000
    }
    if (
        lower.includes('qwen3') ||
        lower.includes('qwen2.5-coder') ||
        lower.includes('qwen2.5') ||
        lower.includes('qwen')
    ) {
        return 32768
    }
    if (lower.includes('codellama')) return 16384
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
