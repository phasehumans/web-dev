export interface OpenRouterModelItem {
    label: string
    value: string
}

export const FALLBACK_OPENROUTER_MODELS: OpenRouterModelItem[] = [
    {
        label: '(free) Google: Gemma 4 26B A4B',
        value: 'google/gemma-4-26b-a4b-it:free',
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
    { label: 'Anthropic: Claude Opus 5', value: 'anthropic/claude-opus-5' },
    { label: 'Anthropic: Claude Sonnet 5', value: 'anthropic/claude-sonnet-5' },
    { label: 'Anthropic: Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
    { label: 'Anthropic: Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
    { label: 'DeepSeek: DeepSeek R1', value: 'deepseek/deepseek-r1' },
    { label: 'DeepSeek: DeepSeek V3', value: 'deepseek/deepseek-chat' },
    { label: 'Google: Gemini 3.7 Flash', value: 'google/gemini-3.7-flash' },
    { label: 'Google: Gemini 3.6 Flash', value: 'google/gemini-3.6-flash' },
    { label: 'Meta: Llama 4 Scout', value: 'meta-llama/llama-4-scout' },
    { label: 'Meta: Llama 3.3 70B Instruct', value: 'meta-llama/llama-3.3-70b-instruct' },
    { label: 'Mistral: Mistral Large', value: 'mistralai/mistral-large-2512' },
    { label: 'Mistral: Codestral', value: 'mistralai/codestral-2508' },
    { label: 'OpenAI: GPT-5.6 Sol', value: 'openai/gpt-5.6-sol' },
    { label: 'OpenAI: GPT-5.4 Mini', value: 'openai/gpt-5.4-mini' },
    { label: 'OpenAI: GPT-4o', value: 'openai/gpt-4o' },
    { label: 'OpenAI: o3-mini', value: 'openai/o3-mini' },
    { label: 'SpaceXAI: Grok 4.6', value: 'x-ai/grok-4.6' },
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
