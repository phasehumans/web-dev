import { getModelContextWindow } from '@december/providers'

import { FALLBACK_OPENROUTER_MODELS } from './openrouter-models'

export const getProviderModels = (provider: string) => {
    switch (provider) {
        case 'anthropic':
            return [
                { label: 'Claude Opus 5 (Recommended)', value: 'claude-opus-5' },
                { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
                { label: 'Claude Fable 5', value: 'claude-fable-5' },
                { label: 'Claude Haiku 4.5', value: 'claude-haiku-4.5' },
                { label: 'Claude Opus 4.8', value: 'claude-opus-4.8' },
                { label: 'Claude Opus 4.7', value: 'claude-opus-4.7' },
                { label: 'Claude Sonnet 4.6', value: 'claude-sonnet-4.6' },
                { label: 'Claude Opus 4.6', value: 'claude-opus-4.6' },
                { label: 'Claude Opus 4.5', value: 'claude-opus-4.5' },
                { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4.5' },
            ]
        case 'google':
        case 'gemini':
            return [
                { label: 'Gemini 3.7 Flash (Recommended)', value: 'gemini-3.7-flash' },
                { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
                { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
                { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
                { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
                { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
                { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
                { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
                { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            ]
        case 'openai':
            return [
                { label: 'GPT-5.6 Sol (Recommended)', value: 'gpt-5.6-sol' },
                { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
                { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
                { label: 'GPT-5.5 Pro', value: 'gpt-5.5-pro' },
                { label: 'GPT-5.5', value: 'gpt-5.5' },
                { label: 'GPT-5.4 Pro', value: 'gpt-5.4-pro' },
                { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
                { label: 'o4-mini', value: 'o4-mini' },
                { label: 'o3-pro', value: 'o3-pro' },
                { label: 'o3', value: 'o3' },
                { label: 'o1-pro', value: 'o1-pro' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            ]
        case 'openrouter':
            return FALLBACK_OPENROUTER_MODELS
        case 'deepseek':
            return [
                { label: 'DeepSeek V4 Pro (Recommended)', value: 'deepseek-v4-pro' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
            ]
        case 'groq':
            return [
                { label: 'GPT-OSS 120B (Recommended)', value: 'openai/gpt-oss-120b' },
                { label: 'GPT-OSS 20B', value: 'openai/gpt-oss-20b' },
                { label: 'Qwen 3.6 27B', value: 'qwen/qwen3.6-27b' },
                { label: 'Qwen 3.8 27B', value: 'qwen/qwen3.8-27b' },
                { label: 'DeepSeek R1 Distill Llama 70B', value: 'deepseek-r1-distill-llama-70b' },
                { label: 'Groq Compound System', value: 'groq/compound' },
            ]
        case 'huggingface':
            return [
                {
                    label: 'Llama 3.3 70B Instruct (Recommended)',
                    value: 'meta-llama/Llama-3.3-70B-Instruct',
                },
                { label: 'Llama 3.1 8B Instruct', value: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
                { label: 'Llama 3 8B Instruct', value: 'meta-llama/Meta-Llama-3-8B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
            ]
        case 'kimi':
        case 'moonshot':
        case 'moonshoot':
            return [
                { label: 'Kimi K3 (Recommended)', value: 'kimi-k3' },
                { label: 'Kimi K2.7 Code', value: 'kimi-k2.7-code' },
                { label: 'Kimi K2.7 Code Highspeed', value: 'kimi-k2.7-code-highspeed' },
                { label: 'Kimi K2.6', value: 'kimi-k2.6' },
                { label: 'Kimi K2.5', value: 'kimi-k2.5' },
            ]
        case 'mistral':
            return [
                { label: 'Mistral Large (Recommended)', value: 'mistral-large-latest' },
                { label: 'Mistral Medium', value: 'mistral-medium-latest' },
                { label: 'Mistral Small', value: 'mistral-small-latest' },
                { label: 'Codestral', value: 'codestral-latest' },
                { label: 'Devstral', value: 'devstral-latest' },
                { label: 'Devstral 2', value: 'devstral-2512' },
                { label: 'Ministral 14B', value: 'ministral-14b-latest' },
                { label: 'Ministral 8B', value: 'ministral-8b-latest' },
                { label: 'Ministral 3B', value: 'ministral-3b-latest' },
                { label: 'Pixtral Large', value: 'pixtral-large-latest' },
            ]
        case 'xai':
            return [
                { label: 'Grok 4.6 (Recommended)', value: 'grok-4.6' },
                { label: 'Grok 4.5', value: 'grok-4.5' },
                { label: 'Grok 4.3', value: 'grok-4.3' },
                { label: 'Grok 4.20', value: 'grok-4.20' },
                { label: 'Grok Build 0.1', value: 'grok-build-0.1' },
            ]
        case 'zai':
            return [
                { label: 'GLM 5 (Recommended)', value: 'glm-5' },
                { label: 'GLM 5 Turbo', value: 'glm-5-turbo' },
                { label: 'GLM 4.7', value: 'glm-4.7' },
                { label: 'GLM 4.7 Flash', value: 'glm-4.7-flash' },
                { label: 'GLM 4.5 Air', value: 'glm-4.5-air' },
                { label: 'GLM 4 Plus', value: 'glm-4-plus' },
                { label: 'GLM 4 Flash', value: 'glm-4-flash' },
            ]
        case 'nvidia':
        case 'nim':
            return [
                { label: 'GPT-OSS 120B (Recommended)', value: 'openai/gpt-oss-120b' },
                { label: 'GPT-OSS 20B', value: 'openai/gpt-oss-20b' },
                { label: 'Nemotron 3.5 Lightning', value: 'nvidia/nemotron-3.5-lightning-30b-a3b' },
                { label: 'Nemotron 3 Super 120B', value: 'nvidia/nemotron-3-super-120b-a12b' },
                { label: 'Nemotron 3 Ultra 550B', value: 'nvidia/nemotron-3-ultra-550b-a55b' },
                { label: 'Llama 3.2 11B Vision', value: 'meta/llama-3.2-11b-vision-instruct' },
                { label: 'Kimi K3', value: 'moonshotai/kimi-k3' },
                { label: 'MiniMax M3', value: 'minimaxai/minimax-m3' },
            ]
        case 'sambanova':
            return [
                {
                    label: 'Llama 3.3 70B Instruct (Recommended)',
                    value: 'Meta-Llama-3.3-70B-Instruct',
                },
                { label: 'DeepSeek R1', value: 'DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'DeepSeek-V3' },
                { label: 'Llama 3.1 8B Instruct', value: 'Meta-Llama-3.1-8B-Instruct' },
            ]
        case 'cerebras':
            return [
                { label: 'GPT-OSS 120B (Recommended)', value: 'gpt-oss-120b' },
                { label: 'Gemma 4 31B', value: 'gemma-4-31b' },
            ]
        case 'siliconflow':
        case 'siliconcloud':
            return [
                { label: 'DeepSeek R1 (Recommended)', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
            ]
        case 'together':
        case 'togetherai':
            return [
                {
                    label: 'Llama 3.3 70B Turbo (Recommended)',
                    value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
                },
                { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
            ]
        case 'hyperbolic':
            return [
                { label: 'DeepSeek R1 (Recommended)', value: 'deepseek-ai/DeepSeek-R1' },
                { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
                { label: 'Llama 3.3 70B', value: 'meta-llama/Llama-3.3-70B-Instruct' },
                { label: 'Llama 3.1 405B', value: 'meta-llama/Meta-Llama-3.1-405B-Instruct' },
                { label: 'Llama 3.1 70B', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
                { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
            ]
        case 'fireworks':
        case 'fireworksai':
            return [
                {
                    label: 'DeepSeek R1 (Recommended)',
                    value: 'accounts/fireworks/models/deepseek-r1',
                },
                { label: 'DeepSeek V3', value: 'accounts/fireworks/models/deepseek-v3' },
                {
                    label: 'Llama 3.3 70B',
                    value: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
                },
                {
                    label: 'Llama 3.1 405B',
                    value: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
                },
                {
                    label: 'Qwen 2.5 Coder 32B',
                    value: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct',
                },
                { label: 'Qwen 2.5 72B', value: 'accounts/fireworks/models/qwen2p5-72b-instruct' },
            ]
        case 'perplexity':
            return [
                { label: 'Sonar Reasoning Pro (Recommended)', value: 'sonar-reasoning-pro' },
                { label: 'Sonar Pro', value: 'sonar-pro' },
                { label: 'Sonar', value: 'sonar' },
            ]
        case 'cohere':
            return [
                { label: 'Command A (Recommended)', value: 'command-a-03-2025' },
                { label: 'Command R+', value: 'command-r-plus-08-2024' },
                { label: 'Command R', value: 'command-r-08-2024' },
            ]
        case 'agentrouter':
        case 'agentrouter.org':
            return [
                { label: 'GLM 5.3 (Recommended)', value: 'glm-5.3' },
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
                { label: 'Claude Opus 4.8', value: 'claude-opus-4-8' },
                { label: 'Claude Opus 5', value: 'claude-opus-5' },
            ]
        case 'december':
        case 'december_proxy':
            return [
                { label: 'Gemini 3.7 Flash', value: 'gemini-3.7-flash' },
                { label: 'Claude Sonnet 5', value: 'claude-sonnet-5' },
                { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
                { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
                { label: 'o4-mini', value: 'o4-mini' },
            ]
        case 'copilot':
        case 'github_copilot':
        case 'github':
            return [
                { label: 'GPT-4o (Recommended)', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'GPT-4.1', value: 'gpt-4.1' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3.5-sonnet' },
                { label: 'Claude 3.7 Sonnet', value: 'claude-3.7-sonnet' },
                { label: 'o3-mini', value: 'o3-mini' },
            ]
        case 'claude':
            return getProviderModels('anthropic')
        case 'codex':
        case 'chatgpt':
            return getProviderModels('openai')
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
        'nvidia',
        'sambanova',
        'cerebras',
        'siliconflow',
        'together',
        'hyperbolic',
        'fireworks',
        'perplexity',
        'cohere',
        'agentrouter',
        'copilot',
        'claude',
        'codex',
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
    if (provider === 'agentrouter' && (model.includes('/') || model.includes(':'))) return true
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
    return 'gemini-3.7-flash'
}

export const ensureValidModelForProvider = (provider: string, model?: string): string => {
    if (model && isValidModelForProvider(provider, model)) {
        return model
    }
    return getDefaultModelForProvider(provider)
}

export { getModelContextWindow }
