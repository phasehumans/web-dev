export interface OpenRouterModelItem {
    label: string
    value: string
}

export const FALLBACK_OPENROUTER_MODELS: OpenRouterModelItem[] = [
    {
        label: '(free) Meta: Llama 3.3 70B Instruct',
        value: 'meta-llama/llama-3.3-70b-instruct:free',
    },
    {
        label: '(free) Meta: Llama 3 8B Instruct',
        value: 'meta-llama/llama-3-8b-instruct:free',
    },
    {
        label: '(free) Mistral: Mistral 7B Instruct',
        value: 'mistralai/mistral-7b-instruct:free',
    },
    {
        label: '(free) DeepSeek: DeepSeek R1',
        value: 'deepseek/deepseek-r1:free',
    },
    {
        label: '(free) Google: Gemini 2.0 Flash Experimental',
        value: 'google/gemini-2.0-flash-exp:free',
    },
    { label: 'Anthropic: Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
    { label: 'Anthropic: Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
    { label: 'DeepSeek: DeepSeek R1', value: 'deepseek/deepseek-r1' },
    { label: 'DeepSeek: DeepSeek V3', value: 'deepseek/deepseek-chat' },
    { label: 'Google: Gemini 3.7 Flash', value: 'google/gemini-3.7-flash' },
    { label: 'Google: Gemini 3.6 Flash', value: 'google/gemini-3.6-flash' },
    { label: 'Meta: Llama 3.3 70B Instruct', value: 'meta-llama/llama-3.3-70b-instruct' },
    { label: 'OpenAI: GPT-4o', value: 'openai/gpt-4o' },
    { label: 'OpenAI: o3-mini', value: 'openai/o3-mini' },
]

let cachedModels: OpenRouterModelItem[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function clearOpenRouterModelsCache(): void {
    cachedModels = null
    cacheTimestamp = 0
}

export async function fetchOpenRouterModels(
    apiKey?: string,
    forceRefresh = false
): Promise<OpenRouterModelItem[]> {
    const now = Date.now()
    if (!forceRefresh && cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedModels
    }

    try {
        const headers: Record<string, string> = {
            'HTTP-Referer': 'https://trydecember.com',
            'X-Title': 'December',
        }
        if (apiKey) {
            headers.Authorization = `Bearer ${apiKey}`
        }

        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers,
        })

        if (!response.ok) {
            throw new Error(`OpenRouter models API returned status ${response.status}`)
        }

        const data: any = await response.json()
        if (!data || !Array.isArray(data.data)) {
            throw new Error('Invalid OpenRouter models API response structure')
        }

        const models: OpenRouterModelItem[] = data.data.map((m: any) => {
            const isFree =
                (parseFloat(m.pricing?.prompt) === 0 && parseFloat(m.pricing?.completion) === 0) ||
                m.id?.endsWith(':free') ||
                m.name?.toLowerCase().includes('(free)')

            const rawName = m.name || m.id
            const cleanName = rawName.replace(/\(free\)/gi, '').trim()
            const label = isFree ? `(free) ${cleanName}` : cleanName

            return {
                label,
                value: m.id,
            }
        })

        models.sort((a, b) => {
            const aFree = a.label.startsWith('(free)')
            const bFree = b.label.startsWith('(free)')
            if (aFree && !bFree) return -1
            if (!aFree && bFree) return 1
            return a.label.localeCompare(b.label)
        })

        cachedModels = models
        cacheTimestamp = now
        return models
    } catch {
        // Intentionally swallowed: fallback to curated OpenRouter model list on network or parse failures
        return FALLBACK_OPENROUTER_MODELS
    }
}
