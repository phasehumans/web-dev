import {
    openaiProvider,
    anthropicProvider,
    geminiProvider,
    openrouterProvider,
    ollamaProvider,
    copilotProvider,
} from '@december/providers'

import type { SubscriptionTokenBundle } from '../auth/subscriptions/types'

export interface InstantiateProviderOptions {
    authMethod?: 'byok' | 'december' | 'env' | 'subscription'
    subscription?: SubscriptionTokenBundle
    headers?: Record<string, string>
    baseURL?: string
}

export function instantiateProvider(
    provider: string,
    apiKey: string,
    options?: InstantiateProviderOptions
): any {
    const normalized = (provider || '').toLowerCase().trim()
    switch (normalized) {
        case 'copilot':
        case 'github_copilot':
        case 'github': {
            const endpoint = options?.baseURL || options?.subscription?.endpoint
            return copilotProvider(apiKey, {
                endpoint,
                headers: options?.headers,
            })
        }
        case 'openai':
        case 'codex':
        case 'chatgpt': {
            if (options?.baseURL || options?.headers) {
                return openaiProvider(options?.baseURL, apiKey, options?.headers)
            }
            return openaiProvider(undefined, apiKey)
        }
        case 'anthropic':
        case 'claude': {
            if (options?.authMethod === 'subscription' || options?.subscription) {
                const headers = {
                    'anthropic-beta': 'oauth-2024-11-18',
                    ...(options?.headers || {}),
                }
                return anthropicProvider(options?.baseURL, apiKey, headers)
            }
            if (options?.baseURL || options?.headers) {
                return anthropicProvider(options?.baseURL, apiKey, options?.headers)
            }
            return anthropicProvider(undefined, apiKey)
        }
        case 'gemini':
        case 'google':
        case 'antigravity':
            return geminiProvider(apiKey)
        case 'openrouter':
            return openrouterProvider(apiKey)
        case 'deepseek':
            return openaiProvider('https://api.deepseek.com', apiKey)
        case 'groq':
            return openaiProvider('https://api.groq.com/openai/v1', apiKey)
        case 'huggingface':
            return openaiProvider('https://api-inference.huggingface.co/v1/', apiKey)
        case 'kimi':
            return anthropicProvider('https://api.kimi.com/coding', apiKey)
        case 'moonshot':
        case 'moonshoot':
            return openaiProvider('https://api.moonshot.ai/v1', apiKey)
        case 'mistral':
            return openaiProvider('https://api.mistral.ai/v1', apiKey)
        case 'xai':
            return openaiProvider('https://api.x.ai/v1', apiKey)
        case 'zai':
            return openaiProvider('https://api.z.ai/api/coding/paas/v4', apiKey)
        case 'nvidia':
        case 'nim':
            return openaiProvider('https://integrate.api.nvidia.com/v1', apiKey)
        case 'sambanova':
            return openaiProvider('https://api.sambanova.ai/v1', apiKey)
        case 'cerebras':
            return openaiProvider('https://api.cerebras.ai/v1', apiKey)
        case 'siliconflow':
        case 'siliconcloud':
            return openaiProvider('https://api.siliconflow.cn/v1', apiKey)
        case 'together':
        case 'togetherai':
            return openaiProvider('https://api.together.xyz/v1', apiKey)
        case 'hyperbolic':
            return openaiProvider('https://api.hyperbolic.xyz/v1', apiKey)
        case 'fireworks':
        case 'fireworksai':
            return openaiProvider('https://api.fireworks.ai/inference/v1', apiKey)
        case 'perplexity':
            return openaiProvider('https://api.perplexity.ai', apiKey)
        case 'cohere':
            return openaiProvider('https://api.cohere.com/v2', apiKey)
        case 'agentrouter':
        case 'agentrouter.org':
            return openaiProvider('https://agentrouter.org/v1', apiKey, {
                'User-Agent': 'claude-cli/2.1.0 (external, sdk-cli)',
            })
        case 'ollama': {
            let endpoint = 'http://localhost:11434/v1'
            if (apiKey && (apiKey.startsWith('http://') || apiKey.startsWith('https://'))) {
                endpoint = apiKey.endsWith('/v1') ? apiKey : `${apiKey.replace(/\/+$/, '')}/v1`
            } else if (process.env.OLLAMA_HOST) {
                const host = process.env.OLLAMA_HOST
                endpoint = host.endsWith('/v1') ? host : `${host.replace(/\/+$/, '')}/v1`
            }
            return ollamaProvider(endpoint, 'ollama')
        }
        default: {
            const serverUrl =
                process.env.SERVER_URL ||
                (process.env.NODE_ENV !== 'production' && process.env.SERVER_PORT
                    ? `http://localhost:${process.env.SERVER_PORT}`
                    : 'https://api.trydecember.com')
            const proxyUrl = `${serverUrl.replace(/\/+$/, '')}/api/v1/cli`
            return openaiProvider(proxyUrl, apiKey)
        }
    }
}
