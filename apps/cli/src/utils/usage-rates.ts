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
    anthropic: 'https://console.anthropic.com/settings/billing',
    openai: 'https://platform.openai.com/usage',
    google: 'https://aistudio.google.com/app/plan_information',
    openrouter: 'https://openrouter.ai/activity',
    deepseek: 'https://platform.deepseek.com/usage',
    ollama: 'http://localhost:11434 (Local & Free)',
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

export function formatUsageCard(params: {
    model: string
    promptTokens: number
    completionTokens: number
    cachedPromptTokens?: number
    provider?: string
}): string {
    const {
        model,
        promptTokens,
        completionTokens,
        cachedPromptTokens = 0,
        provider = 'google',
    } = params
    const totalTokens = promptTokens + completionTokens
    const cost = calculateUsageCost({ model, promptTokens, completionTokens, cachedPromptTokens })
    const billingLink =
        PROVIDER_BILLING_LINKS[provider.toLowerCase()] || `https://openrouter.ai/activity`

    const formatNum = (n: number) => n.toLocaleString('en-US')
    const formatDollar = (n: number) =>
        n === 0 ? '$0.00' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`

    return `### Session Usage & Costs
**Model**: \`${model}\` (${provider.toUpperCase()})

| Metric | Tokens | Estimated Cost |
| :--- | :--- | :--- |
| **Prompt (Input)** | ${formatNum(promptTokens)} | ${formatDollar(cost.promptCost)} |
| **Completion (Output)** | ${formatNum(completionTokens)} | ${formatDollar(cost.completionCost)} |
${cachedPromptTokens > 0 ? `| **Cache Savings** | ${formatNum(cachedPromptTokens)} | -${formatDollar(cost.cacheSavings)} |\n` : ''}| **Total Session** | **${formatNum(totalTokens)}** | **${formatDollar(cost.totalCost)}** |

> **Official Rates**: $${cost.rate.inputRate.toFixed(2)} / 1M in · $${cost.rate.outputRate.toFixed(2)} / 1M out
> **Provider Billing & Quota**: [${billingLink}](${billingLink})`
}
