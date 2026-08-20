import { AUTH_REQUIRED_NOTICE } from '../constants/messages'

export interface ModelRate {
    name: string
    inputRate: number // $ per 1M tokens
    outputRate: number // $ per 1M tokens
}

export const OFFICIAL_MODEL_RATES: Record<string, ModelRate> = {
    // Google Gemini
    'gemini-3.7-flash': { name: 'gemini-3.7-flash', inputRate: 0.1, outputRate: 0.4 },
    'gemini-3.6-flash': { name: 'gemini-3.6-flash', inputRate: 0.1, outputRate: 0.4 },
    'gemini-3.5-flash': { name: 'gemini-3.5-flash', inputRate: 0.1, outputRate: 0.4 },
    'gemini-3.5-flash-lite': { name: 'gemini-3.5-flash-lite', inputRate: 0.05, outputRate: 0.2 },
    'gemini-2.5-flash': { name: 'gemini-2.5-flash', inputRate: 0.075, outputRate: 0.3 },
    'gemini-2.5-pro': { name: 'gemini-2.5-pro', inputRate: 1.25, outputRate: 5.0 },
    'gemini-3-pro-preview': { name: 'gemini-3-pro-preview', inputRate: 1.25, outputRate: 5.0 },
    'gemini-3.1-pro': { name: 'gemini-3.1-pro', inputRate: 1.25, outputRate: 5.0 },

    // Anthropic Claude
    'claude-3-7-sonnet': { name: 'claude-3-7-sonnet', inputRate: 3.0, outputRate: 15.0 },
    'claude-3-7-sonnet-latest': {
        name: 'claude-3-7-sonnet-latest',
        inputRate: 3.0,
        outputRate: 15.0,
    },
    'claude-3-5-sonnet': { name: 'claude-3-5-sonnet', inputRate: 3.0, outputRate: 15.0 },
    'claude-3-5-sonnet-latest': {
        name: 'claude-3-5-sonnet-latest',
        inputRate: 3.0,
        outputRate: 15.0,
    },
    'claude-3-5-haiku': { name: 'claude-3-5-haiku', inputRate: 0.8, outputRate: 4.0 },
    'claude-3-5-haiku-latest': { name: 'claude-3-5-haiku-latest', inputRate: 0.8, outputRate: 4.0 },
    'claude-3-opus': { name: 'claude-3-opus', inputRate: 15.0, outputRate: 75.0 },
    'claude-3-opus-latest': { name: 'claude-3-opus-latest', inputRate: 15.0, outputRate: 75.0 },

    // OpenAI
    'gpt-4o': { name: 'gpt-4o', inputRate: 2.5, outputRate: 10.0 },
    'gpt-4o-mini': { name: 'gpt-4o-mini', inputRate: 0.15, outputRate: 0.6 },
    'gpt-4.5-preview': { name: 'gpt-4.5-preview', inputRate: 75.0, outputRate: 150.0 },
    'o3-mini': { name: 'o3-mini', inputRate: 1.1, outputRate: 4.4 },
    o1: { name: 'o1', inputRate: 15.0, outputRate: 60.0 },
    'o1-mini': { name: 'o1-mini', inputRate: 1.1, outputRate: 4.4 },

    // DeepSeek
    'deepseek-chat': { name: 'deepseek-chat', inputRate: 0.14, outputRate: 0.28 },
    'deepseek-v3': { name: 'deepseek-v3', inputRate: 0.14, outputRate: 0.28 },
    'deepseek-reasoner': { name: 'deepseek-reasoner', inputRate: 0.55, outputRate: 2.19 },
    'deepseek-r1': { name: 'deepseek-r1', inputRate: 0.55, outputRate: 2.19 },

    // Ollama (Local)
    ollama: { name: 'ollama', inputRate: 0.0, outputRate: 0.0 },
}

export const PROVIDER_BILLING_LINKS: Record<string, string> = {
    december: 'https://trydecember.com/settings/usage',
    google: 'https://aistudio.google.com/app/usage',
    gemini: 'https://aistudio.google.com/app/usage',
    anthropic: 'https://console.anthropic.com/settings/billing',
    openai: 'https://platform.openai.com/usage',
    openrouter: 'https://openrouter.ai/activity',
    deepseek: 'https://platform.deepseek.com/usage',
    groq: 'https://console.groq.com/usage',
    mistral: 'https://console.mistral.ai/billing/',
    moonshot: 'https://platform.moonshot.cn/console/recharge',
    kimi: 'https://platform.moonshot.cn/console/recharge',
    xai: 'https://console.x.ai/',
    zai: 'https://open.bigmodel.cn/usercenter/apikeys',
    huggingface: 'https://huggingface.co/settings/billing',
    ollama: 'http://localhost:11434',
}

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
    december: 'December Cloud',
    google: 'Google AI Studio',
    gemini: 'Google AI Studio',
    anthropic: 'Anthropic Console',
    openai: 'OpenAI Platform',
    openrouter: 'OpenRouter',
    deepseek: 'DeepSeek Platform',
    groq: 'Groq Cloud',
    mistral: 'Mistral AI',
    moonshot: 'Moonshot AI (Kimi)',
    kimi: 'Moonshot AI (Kimi)',
    xai: 'xAI Console',
    zai: 'Zhipu AI (GLM)',
    huggingface: 'Hugging Face',
    ollama: 'Ollama (Local)',
}

export function inferProviderFromModel(modelName: string): string {
    const lower = (modelName || '').toLowerCase()
    if (lower.startsWith('claude') || lower.startsWith('anthropic/')) return 'anthropic'
    if (
        lower.startsWith('gpt') ||
        lower.startsWith('o1') ||
        lower.startsWith('o3') ||
        lower.startsWith('openai/')
    )
        return 'openai'
    if (lower.startsWith('gemini') || lower.startsWith('google/')) return 'google'
    if (lower.startsWith('deepseek')) return 'deepseek'
    if (lower.startsWith('groq') || lower.includes('llama-3.3-70b-versatile')) return 'groq'
    if (lower.startsWith('mistral') || lower.startsWith('codestral') || lower.startsWith('pixtral'))
        return 'mistral'
    if (lower.startsWith('moonshot') || lower.startsWith('kimi')) return 'moonshot'
    if (lower.startsWith('grok') || lower.startsWith('xai')) return 'xai'
    if (lower.startsWith('zai') || lower.startsWith('glm')) return 'zai'
    if (lower.includes('meta-llama') || lower.includes('qwen/')) return 'huggingface'
    if (lower.includes('ollama') || lower.includes('llama') || lower.includes('qwen'))
        return 'ollama'
    return 'openrouter'
}

export function resolveModelRate(modelName: string): ModelRate {
    const normalized = (modelName || '').trim().toLowerCase()
    const stripped = normalized.includes('/') ? normalized.split('/').pop()! : normalized

    if (OFFICIAL_MODEL_RATES[normalized]) return OFFICIAL_MODEL_RATES[normalized]
    if (OFFICIAL_MODEL_RATES[stripped]) return OFFICIAL_MODEL_RATES[stripped]

    if (normalized.includes('ollama') || stripped.includes('llama') || stripped.includes('qwen')) {
        return { name: modelName, inputRate: 0.0, outputRate: 0.0 }
    }

    return {
        name: modelName,
        inputRate: 2.0,
        outputRate: 8.0,
    }
}

export interface UsageCalculationParams {
    model: string
    promptTokens: number
    completionTokens: number
    cachedPromptTokens?: number
}

export interface UsageCalculationResult {
    promptCost: number
    completionCost: number
    cacheSavings: number
    totalCost: number
    rate: ModelRate
}

export function calculateUsageCost({
    model,
    promptTokens,
    completionTokens,
    cachedPromptTokens = 0,
}: UsageCalculationParams): UsageCalculationResult {
    const rate = resolveModelRate(model)
    const promptCost = (promptTokens / 1_000_000) * rate.inputRate
    const completionCost = (completionTokens / 1_000_000) * rate.outputRate
    // Cached prompt tokens typically receive a 90% discount
    const cacheSavings = (cachedPromptTokens / 1_000_000) * rate.inputRate * 0.9
    const totalCost = Math.max(0, promptCost + completionCost - cacheSavings)

    return {
        promptCost,
        completionCost,
        cacheSavings,
        totalCost,
        rate,
    }
}

export interface FormatUsageCardParams {
    model: string
    authMethod?: 'byok' | 'december' | 'env' | string
    provider?: string
    isAuthenticated?: boolean
    promptTokens?: number
    completionTokens?: number
    cachedPromptTokens?: number
}

export function formatUsageCard(params: FormatUsageCardParams): string {
    const { model, authMethod = 'byok', isAuthenticated = true } = params
    let providerKey = (params.provider || '').toLowerCase()

    if (!isAuthenticated) {
        return AUTH_REQUIRED_NOTICE
    }

    if (authMethod === 'december') {
        const billingLink = PROVIDER_BILLING_LINKS.december
        return `Active Model: \`${model}\` (December Wallet)
Provider: December Cloud

*Usage is deducted directly from your December account credits. Request telemetry, token consumption, and monthly invoices are tracked at [${billingLink}](${billingLink})*`
    }

    if (!providerKey || providerKey === 'december_proxy') {
        providerKey = inferProviderFromModel(model)
    }

    if (providerKey === 'ollama' || model.toLowerCase().includes('ollama')) {
        const link = PROVIDER_BILLING_LINKS.ollama
        return `Active Model: \`${model}\` (Local)
Provider: Ollama (Local)

*Running completely locally on your hardware with no API keys, no external network calls, and no usage fees. View status and local models at [${link}](${link})*`
    }

    const displayName = PROVIDER_DISPLAY_NAMES[providerKey] || providerKey.toUpperCase()
    const billingLink = PROVIDER_BILLING_LINKS[providerKey] || `https://openrouter.ai/activity`

    return `Active Model: \`${model}\` (BYOK)
Provider: ${displayName}

*Prompts go directly to the provider API; December servers do not track, log, or bill this usage. Token consumption, quotas, and billing are managed in your ${displayName} account at [${billingLink}](${billingLink})*`
}
