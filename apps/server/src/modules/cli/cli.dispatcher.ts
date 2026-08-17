import { env } from '../../env'
import { AppError } from '../../shared/appError'

export interface UpstreamDispatchConfig {
    url: string
    headers: Record<string, string>
    body: any
    providerName: 'gemini' | 'openai' | 'deepseek' | 'openrouter'
}

export const OPENROUTER_MODEL_MAP: Record<string, string> = {
    'gemini-3.7-flash': 'google/gemini-3.7-flash',
    'gemini-3.6-flash': 'google/gemini-3.6-flash',
    'gemini-3.5-flash': 'google/gemini-3.5-flash',
    'gemini-3.5-flash-lite': 'google/gemini-3.5-flash-lite',
    'gemini-2.5-flash': 'google/gemini-2.5-flash',
    'gemini-2.5-pro': 'google/gemini-2.5-pro',
    'gemini-3-pro-preview': 'google/gemini-3-pro-preview',
    'gemini-3.1-pro': 'google/gemini-3-pro-preview',
    'claude-3-7-sonnet-latest': 'anthropic/claude-3.7-sonnet',
    'claude-3-5-sonnet-latest': 'anthropic/claude-3.5-sonnet',
    'claude-3-5-haiku-latest': 'anthropic/claude-3.5-haiku',
    'claude-3-opus-latest': 'anthropic/claude-3.5-sonnet',
    'o3-mini': 'openai/o3-mini',
    o1: 'openai/o1',
    'o1-mini': 'openai/o1-mini',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4.5-preview': 'openai/gpt-4.5-preview',
    'deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek-chat': 'deepseek/deepseek-chat',
}

export function resolveUpstreamDispatch(incomingBody: any): UpstreamDispatchConfig {
    const body = { ...incomingBody }
    body.stream = true
    if (!body.stream_options) {
        body.stream_options = { include_usage: true }
    } else {
        body.stream_options.include_usage = true
    }

    const model = (body.model || '').trim()
    const lowerModel = model.toLowerCase()
    const strippedModel = lowerModel.includes('/') ? lowerModel.split('/').pop()! : lowerModel

    // 1. Direct Google Gemini API (via Google's OpenAI-compatible endpoint)
    const isGeminiModel = lowerModel.startsWith('gemini') || lowerModel.startsWith('google/')
    if (isGeminiModel && env.GEMINI_API_KEY) {
        body.model = strippedModel
        return {
            url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            headers: {
                Authorization: `Bearer ${env.GEMINI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body,
            providerName: 'gemini',
        }
    }

    // 2. Direct OpenAI API
    const isOpenAiModel =
        lowerModel.startsWith('gpt') ||
        lowerModel.startsWith('o1') ||
        lowerModel.startsWith('o3') ||
        lowerModel.startsWith('openai/')
    if (isOpenAiModel && env.OPENAI_API_KEY) {
        body.model = strippedModel
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body,
            providerName: 'openai',
        }
    }

    // 3. Direct DeepSeek API
    const isDeepSeekModel = lowerModel.startsWith('deepseek')
    if (isDeepSeekModel && env.DEEPSEEK_API_KEY) {
        body.model = strippedModel
        return {
            url: 'https://api.deepseek.com/chat/completions',
            headers: {
                Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body,
            providerName: 'deepseek',
        }
    }

    // 4. OpenRouter Gateway Fallback
    if (env.OPENROUTER_API_KEY) {
        body.model = OPENROUTER_MODEL_MAP[model] || OPENROUTER_MODEL_MAP[strippedModel] || model
        return {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            headers: {
                Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': env.WEB_URL || 'https://trydecember.com',
                'X-Title': 'December Proxy',
            },
            body,
            providerName: 'openrouter',
        }
    }

    throw new AppError(
        `No upstream provider API key configured for model "${model}". Please configure GEMINI_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY on the server.`,
        500
    )
}
