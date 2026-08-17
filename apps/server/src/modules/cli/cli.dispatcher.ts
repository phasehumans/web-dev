import {
    geminiProvider,
    anthropicProvider,
    openaiProvider,
    openrouterProvider,
} from '@december/providers'

import { env } from '../../env'
import { AppError } from '../../shared/appError'

import type { ServerProviderResolution } from './cli.types'

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
    'claude-3-opus-latest': 'anthropic/claude-3-opus',
    'o3-mini': 'openai/o3-mini',
    o1: 'openai/o1',
    'o1-mini': 'openai/o1-mini',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4.5-preview': 'openai/gpt-4.5-preview',
    'deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek-chat': 'deepseek/deepseek-chat',
}

export function resolveServerProvider(modelInput?: string): ServerProviderResolution {
    const model = (modelInput || '').trim()
    const lowerModel = model.toLowerCase()
    const strippedModel = lowerModel.includes('/') ? lowerModel.split('/').pop()! : lowerModel

    // 1. Direct Google Gemini Native Provider (@google/genai)
    const isGeminiModel = lowerModel.startsWith('gemini') || lowerModel.startsWith('google/')
    if (isGeminiModel && env.GEMINI_API_KEY) {
        return {
            provider: geminiProvider(env.GEMINI_API_KEY),
            providerName: 'gemini',
            model: strippedModel,
        }
    }

    // 2. Direct Anthropic Provider (@anthropic-ai/sdk)
    const isAnthropicModel = lowerModel.startsWith('claude') || lowerModel.startsWith('anthropic/')
    if (isAnthropicModel && env.ANTHROPIC_API_KEY) {
        return {
            provider: anthropicProvider(undefined, env.ANTHROPIC_API_KEY),
            providerName: 'anthropic',
            model: strippedModel,
        }
    }

    // 3. Direct OpenAI Provider
    const isOpenAiModel =
        lowerModel.startsWith('gpt') ||
        lowerModel.startsWith('o1') ||
        lowerModel.startsWith('o3') ||
        lowerModel.startsWith('openai/')
    if (isOpenAiModel && env.OPENAI_API_KEY) {
        return {
            provider: openaiProvider(undefined, env.OPENAI_API_KEY),
            providerName: 'openai',
            model: strippedModel,
        }
    }

    // 4. Direct DeepSeek Provider
    const isDeepSeekModel = lowerModel.startsWith('deepseek')
    if (isDeepSeekModel && env.DEEPSEEK_API_KEY) {
        return {
            provider: openaiProvider('https://api.deepseek.com', env.DEEPSEEK_API_KEY),
            providerName: 'deepseek',
            model: strippedModel,
        }
    }

    // 5. OpenRouter Gateway Fallback
    if (env.OPENROUTER_API_KEY) {
        const mappedModel =
            OPENROUTER_MODEL_MAP[model] || OPENROUTER_MODEL_MAP[strippedModel] || model
        return {
            provider: openrouterProvider(env.OPENROUTER_API_KEY),
            providerName: 'openrouter',
            model: mappedModel,
        }
    }

    throw new AppError(
        `No upstream provider API key configured for model "${model}". Please configure GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY on the server.`,
        500
    )
}

export const cliDispatcher = {
    resolveServerProvider,
}
