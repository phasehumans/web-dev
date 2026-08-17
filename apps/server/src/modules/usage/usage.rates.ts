import type { ModelRate } from './usage.types'

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
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const ratesCache = new Map<string, ModelRate>()
let lastFetchTimestamp = 0

export function clearRatesCache(): void {
    ratesCache.clear()
    lastFetchTimestamp = 0
}

export async function fetchLiveModelRates(force = false): Promise<void> {
    const isExpired = Date.now() - lastFetchTimestamp > CACHE_TTL_MS
    if (!force && !isExpired && ratesCache.size > 0) {
        return
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Accept: 'application/json' },
        })

        if (!response.ok) {
            return
        }

        const data = (await response.json()) as any
        if (!data || !Array.isArray(data.data)) {
            return
        }

        for (const item of data.data) {
            const rawId = item.id
            if (!rawId || typeof rawId !== 'string') continue

            const promptPerToken = parseFloat(item.pricing?.prompt || '0')
            const completionPerToken = parseFloat(item.pricing?.completion || '0')

            // Convert USD/token to USD/1M tokens
            const inputRate = promptPerToken * 1_000_000
            const outputRate = completionPerToken * 1_000_000

            const rateObj: ModelRate = {
                name: rawId,
                inputRate,
                outputRate,
            }

            ratesCache.set(rawId.toLowerCase(), rateObj)

            // Also index by bare model name without provider prefix (e.g. "gemini-2.5-flash")
            const parts = rawId.split('/')
            if (parts.length > 1) {
                const suffix = parts.slice(1).join('/').toLowerCase()
                if (!ratesCache.has(suffix)) {
                    ratesCache.set(suffix, rateObj)
                }
            }
        }

        lastFetchTimestamp = Date.now()
    } catch {
        // Intentionally swallowed: fallback to embedded official catalog if offline
    }
}

export function resolveModelRate(modelName: string): ModelRate {
    const normalized = modelName.trim().toLowerCase()
    const stripped = normalized.includes('/') ? normalized.split('/').pop()! : normalized

    // 1. Check optional manual environment variable overrides (MODEL_1_NAME, etc.)
    for (let i = 1; i <= 8; i++) {
        const envName = process.env[`MODEL_${i}_NAME`]?.trim().toLowerCase()
        if (envName && (envName === normalized || envName === stripped)) {
            const inRate = parseFloat(process.env[`MODEL_${i}_INPUT_RATE`] ?? '0')
            const outRate = parseFloat(process.env[`MODEL_${i}_OUTPUT_RATE`] ?? '0')
            return {
                name: modelName,
                inputRate: inRate,
                outputRate: outRate,
            }
        }
    }

    // 2. Check live cached rates
    if (ratesCache.has(normalized)) {
        return ratesCache.get(normalized)!
    }
    if (ratesCache.has(stripped)) {
        return ratesCache.get(stripped)!
    }

    // 3. Check official embedded catalog
    if (OFFICIAL_MODEL_RATES[normalized]) {
        return OFFICIAL_MODEL_RATES[normalized]
    }
    if (OFFICIAL_MODEL_RATES[stripped]) {
        return OFFICIAL_MODEL_RATES[stripped]
    }

    // 4. Default fallback rates ($2.00 / $8.00 per 1M tokens or custom fallback env)
    const fallbackInput = parseFloat(process.env.FALLBACK_MODEL_INPUT_RATE ?? '2.00')
    const fallbackOutput = parseFloat(process.env.FALLBACK_MODEL_OUTPUT_RATE ?? '8.00')

    return {
        name: modelName,
        inputRate: fallbackInput,
        outputRate: fallbackOutput,
    }
}
