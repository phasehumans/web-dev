import { getModelContextWindow } from '@december/providers'

import { FALLBACK_OPENROUTER_MODELS } from './openrouter-models'

export const getProviderModels = (provider: string) => {
    switch (provider) {
        case 'anthropic':
            return [
                { label: 'Claude Fable 5', value: 'claude-fable-5' },
                { label: 'Claude Opus 5', value: 'claude-opus-5' },
                { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
                { label: 'Claude Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
                { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-latest' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
                { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
                { label: 'Claude 3 Opus', value: 'claude-3-opus-latest' },
                { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
            ]
        case 'google':
        case 'gemini':
            return [
                { label: 'Gemini 3.7 Flash', value: 'gemini-3.7-flash' },
                { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
                { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
                { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
                { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
                { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
                { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
                { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
                { label: 'Gemini 2.0 Flash Lite', value: 'gemini-2.0-flash-lite' },
                { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
                { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            ]
        case 'openai':
            return [
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
                { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
                { label: 'GPT-5.5 Instant', value: 'gpt-5.5-instant' },
                { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
                { label: 'o3-mini', value: 'o3-mini' },
                { label: 'o1', value: 'o1' },
                { label: 'o1-mini', value: 'o1-mini' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            ]
        case 'openrouter':
            return FALLBACK_OPENROUTER_MODELS
        case 'deepseek':
            return [
                { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
                { label: 'DeepSeek Chat (V3)', value: 'deepseek-chat' },
                { label: 'DeepSeek Reasoner (R1)', value: 'deepseek-reasoner' },
                { label: 'DeepSeek Coder', value: 'deepseek-coder' },
            ]
        case 'groq':
            return [
                { label: 'Llama 3.3 70B Versatile', value: 'llama-3.3-70b-versatile' },
                { label: 'Llama 3.1 8B Instant', value: 'llama-3.1-8b-instant' },
                { label: 'DeepSeek R1 Distill 70B', value: 'deepseek-r1-distill-llama-70b' },
                { label: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768' },
            ]
        case 'huggingface':
            return [
                { label: 'Llama 3.3 70B Instruct', value: 'meta-llama/Llama-3.3-70B-Instruct' },
                { label: 'Llama 3 8B Instruct', value: 'meta-llama/Meta-Llama-3-8B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
            ]
        case 'kimi':
        case 'moonshot':
        case 'moonshoot':
            return [
                { label: 'Moonshot v1 8K', value: 'moonshot-v1-8k' },
                { label: 'Moonshot v1 32K', value: 'moonshot-v1-32k' },
                { label: 'Moonshot v1 128K', value: 'moonshot-v1-128k' },
                { label: 'Kimi K1.5', value: 'kimi-k1.5' },
            ]
        case 'mistral':
            return [
                { label: 'Mistral Large', value: 'mistral-large-latest' },
                { label: 'Mistral Medium', value: 'mistral-medium-latest' },
                { label: 'Mistral Small', value: 'mistral-small-latest' },
                { label: 'Codestral', value: 'codestral-latest' },
                { label: 'Pixtral Large', value: 'pixtral-large-latest' },
            ]
        case 'xai':
            return [
                { label: 'Grok 4.5', value: 'grok-4.5' },
                { label: 'Grok 2', value: 'grok-2-latest' },
                { label: 'Grok 2 Vision', value: 'grok-2-vision-1212' },
                { label: 'Grok Beta', value: 'grok-beta' },
            ]
        case 'zai':
            return [
                { label: 'ZAI v1', value: 'zai-v1' },
                { label: 'GLM 4', value: 'glm-4' },
            ]
        case 'december':
        case 'december_proxy':
            return [
                { label: 'Gemini 3.7 Flash', value: 'gemini-3.7-flash' },
                { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
                { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-latest' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
                { label: 'o3-mini', value: 'o3-mini' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'DeepSeek Reasoner (R1)', value: 'deepseek-reasoner' },
            ]
        case 'ollama':
            return [
                { label: 'Qwen 2.5 Coder 7B (Recommended)', value: 'qwen2.5-coder:7b' },
                { label: 'Qwen 2.5 Coder 14B', value: 'qwen2.5-coder:14b' },
                { label: 'Qwen 2.5 Coder 32B', value: 'qwen2.5-coder:32b' },
                { label: 'Llama 3.3 70B', value: 'llama3.3:70b' },
                { label: 'Llama 3.1 8B', value: 'llama3.1:8b' },
                { label: 'Mistral Nemo 12B', value: 'mistral-nemo:latest' },
            ]
        default:
            return [{ label: 'Default', value: 'default' }]
    }
}

export const isToolCompatibleOllamaModel = (modelName: string): boolean => {
    if (!modelName) return false
    const lower = modelName.toLowerCase()
    const toolKeywords = [
        'qwen2.5-coder',
        'qwen2.5',
        'llama-3.3',
        'llama3.3',
        'llama-3.1',
        'llama3.1',
        'mistral-nemo',
        'codellama',
        'command-r',
        'hermes3',
        'firefunction',
    ]
    return toolKeywords.some((kw) => lower.includes(kw))
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export async function fetchOllamaModels(
    baseUrl: string = 'http://localhost:11434',
    fetchFn: typeof fetch = fetch
): Promise<{ label: string; value: string }[]> {
    try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
        const res = await fetchFn(`${cleanBaseUrl}/api/tags`)
        if (!res.ok) {
            return getProviderModels('ollama')
        }
        const data = (await res.json()) as { models?: { name: string; size: number }[] }
        if (!data.models || data.models.length === 0) {
            return getProviderModels('ollama')
        }
        const filtered = data.models.filter((m) => isToolCompatibleOllamaModel(m.name))
        if (filtered.length === 0) {
            return getProviderModels('ollama')
        }
        return filtered.map((m) => ({
            label: `${m.name} (${formatBytes(m.size)})`,
            value: m.name,
        }))
    } catch {
        // Fallback to curated tool-compatible models on network error
        return getProviderModels('ollama')
    }
}

export async function checkOllamaStatus(
    baseUrl: string = 'http://localhost:11434',
    fetchFn: typeof fetch = fetch
): Promise<{ running: boolean; models: string[]; compatibleModels: string[]; error?: string }> {
    try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')
        const res = await fetchFn(`${cleanBaseUrl}/api/tags`)
        if (!res.ok) {
            return {
                running: false,
                models: [],
                compatibleModels: [],
                error: `HTTP error: ${res.status} ${res.statusText}`,
            }
        }
        const data = (await res.json()) as { models?: { name: string; size: number }[] }
        const allModels = (data.models || []).map((m) => m.name)
        const compatible = allModels.filter((name) => isToolCompatibleOllamaModel(name))
        return {
            running: true,
            models: allModels,
            compatibleModels: compatible,
        }
    } catch (err: any) {
        return {
            running: false,
            models: [],
            compatibleModels: [],
            error: err?.message || String(err),
        }
    }
}

export const getModelLabel = (value: string) => {
    const allProviders = [
        'anthropic',
        'google',
        'openai',
        'openrouter',
        'deepseek',
        'groq',
        'huggingface',
        'kimi',
        'mistral',
        'xai',
        'zai',
        'ollama',
        'december_proxy',
    ]
    for (const p of allProviders) {
        const models = getProviderModels(p)
        const found = models.find((m) => m.value === value)
        if (found) return found.label
    }
    return value
}

export const isValidModelForProvider = (provider: string, model?: string): boolean => {
    if (!model) return false
    if (provider === 'openrouter' && (model.includes('/') || model.includes(':'))) return true
    if (provider === 'ollama') return isToolCompatibleOllamaModel(model)
    const models = getProviderModels(provider)
    return models.some((m) => m.value === model)
}

export const getDefaultModelForProvider = (provider: string): string => {
    if (provider === 'ollama') {
        return 'qwen2.5-coder:7b'
    }
    const models = getProviderModels(provider)
    if (models && models.length > 0 && models[0].value !== 'default') {
        return models[0].value
    }
    return 'gemini-3.6-flash'
}

export { getModelContextWindow }
