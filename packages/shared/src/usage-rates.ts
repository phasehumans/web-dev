export interface ModelRate {
    name: string
    inputRate: number // USD per 1M tokens
    outputRate: number // USD per 1M tokens
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
    'claude-3-5-haiku-latest': {
        name: 'claude-3-5-haiku-latest',
        inputRate: 0.8,
        outputRate: 4.0,
    },
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

    // Ollama / Local
    ollama: { name: 'ollama', inputRate: 0.0, outputRate: 0.0 },
}

export function resolveModelRate(
    modelName: string,
    customCache?: Map<string, ModelRate>
): ModelRate {
    const normalized = (modelName || '').trim().toLowerCase()
    const stripped = normalized.includes('/') ? normalized.split('/').pop()! : normalized

    if (customCache) {
        if (customCache.has(normalized)) return customCache.get(normalized)!
        if (customCache.has(stripped)) return customCache.get(stripped)!
    }

    if (OFFICIAL_MODEL_RATES[normalized]) return OFFICIAL_MODEL_RATES[normalized]
    if (OFFICIAL_MODEL_RATES[stripped]) return OFFICIAL_MODEL_RATES[stripped]

    if (normalized.includes('ollama') || stripped.includes('llama') || stripped.includes('qwen')) {
        return { name: modelName, inputRate: 0.0, outputRate: 0.0 }
    }

    const fallbackInput = parseFloat(process.env.FALLBACK_MODEL_INPUT_RATE ?? '2.00')
    const fallbackOutput = parseFloat(process.env.FALLBACK_MODEL_OUTPUT_RATE ?? '8.00')

    return {
        name: modelName,
        inputRate: isNaN(fallbackInput) ? 2.0 : fallbackInput,
        outputRate: isNaN(fallbackOutput) ? 8.0 : fallbackOutput,
    }
}

export function calculateGenerationCost(data: {
    modelName: string
    inputTokens: number
    outputTokens: number
    customCache?: Map<string, ModelRate>
}): number {
    const { modelName, inputTokens, outputTokens, customCache } = data
    if (inputTokens === 0 && outputTokens === 0) {
        return 0
    }

    let targetModel = modelName
    if (targetModel === 'auto') {
        targetModel = (
            process.env.DEFAULT_MODEL ||
            process.env.AUTO_MODEL ||
            'openai/gpt-oss-20b:free'
        ).trim()
    }

    const rate = resolveModelRate(targetModel, customCache)

    // convert usd per 1m tokens to cents per token:
    // cents/token = (usd/1m * 100) / 1,000,000 = usd/1m / 10,000
    const inputCentsPerToken = rate.inputRate / 10000
    const outputCentsPerToken = rate.outputRate / 10000

    const rawCost = inputTokens * inputCentsPerToken + outputTokens * outputCentsPerToken

    if (rawCost <= 0) {
        return 0
    }

    // Exact sub-cent precision rounded to 6 decimal places (micro-cent resolution)
    return Math.round(rawCost * 1_000_000) / 1_000_000
}

export function startOfUtcMonth(date: Date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function startOfNextUtcMonth(date: Date = new Date()): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}
