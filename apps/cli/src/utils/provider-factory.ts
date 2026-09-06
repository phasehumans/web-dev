import {
    openaiProvider,
    anthropicProvider,
    geminiProvider,
    openrouterProvider,
    ollamaProvider,
    copilotProvider,
    antigravityProvider,
    codexResponsesProvider,
} from '@december/providers'

import type { SubscriptionTokenBundle } from '../auth/subscriptions/types'

export interface InstantiateProviderOptions {
    authMethod?: 'byok' | 'december' | 'env' | 'subscription'
    subscription?: SubscriptionTokenBundle
    headers?: Record<string, string>
    baseURL?: string
}

function withProviderId(provider: any, id: string): any {
    return typeof provider === 'object' && provider !== null ? { ...provider, id } : provider
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
        case 'codex':
        case 'chatgpt': {
            if (options?.authMethod === 'subscription' || options?.subscription) {
                const endpoint = options?.baseURL || options?.subscription?.endpoint
                const accountId = options?.subscription?.extra?.accountId
                return codexResponsesProvider(apiKey, {
                    endpoint,
                    accountId,
                    headers: options?.headers,
                })
            }
            if (options?.baseURL || options?.headers) {
                return openaiProvider(options?.baseURL, apiKey, options?.headers)
            }
            return openaiProvider(undefined, apiKey)
        }
        case 'openai': {
            if (options?.baseURL || options?.headers) {
                return openaiProvider(options?.baseURL, apiKey, options?.headers)
            }
            return openaiProvider(undefined, apiKey)
        }
        case 'antigravity':
            return antigravityProvider(apiKey, {
                endpoint: options?.baseURL,
                headers: options?.headers,
            })
        case 'claude':
        case 'anthropic': {
            if (options?.authMethod === 'subscription' || options?.subscription) {
                const endpoint = options?.baseURL || options?.subscription?.endpoint
                return anthropicProvider(endpoint, apiKey, {
                    ...options?.headers,
                    'anthropic-beta': 'claude-code-20250219,oauth-2024-06-20',
                })
            }
            if (options?.baseURL || options?.headers) {
                return anthropicProvider(options?.baseURL, apiKey, options?.headers)
            }
            return anthropicProvider(undefined, apiKey)
        }
        case 'gemini':
        case 'google': {
            if (options?.authMethod === 'subscription' || options?.subscription) {
                const endpoint = options?.baseURL || options?.subscription?.endpoint
                return antigravityProvider(apiKey, {
                    endpoint,
                    headers: options?.headers,
                })
            }
            return geminiProvider(apiKey)
        }
        case 'openrouter':
            return openrouterProvider(apiKey)
        case 'deepseek':
            return withProviderId(openaiProvider('https://api.deepseek.com', apiKey), 'deepseek')
        case 'groq':
            return withProviderId(openaiProvider('https://api.groq.com/openai/v1', apiKey), 'groq')
        case 'huggingface':
            return withProviderId(
                openaiProvider('https://router.huggingface.co/v1', apiKey),
                'huggingface'
            )
        case 'kimi':
            return withProviderId(anthropicProvider('https://api.kimi.com/coding', apiKey), 'kimi')
        case 'moonshot':
        case 'moonshoot':
            return withProviderId(openaiProvider('https://api.moonshot.ai/v1', apiKey), 'moonshot')
        case 'mistral':
            return withProviderId(openaiProvider('https://api.mistral.ai/v1', apiKey), 'mistral')
        case 'xai':
            return withProviderId(openaiProvider('https://api.x.ai/v1', apiKey), 'xai')
        case 'zai':
            return withProviderId(
                openaiProvider('https://api.z.ai/api/coding/paas/v4', apiKey),
                'zai'
            )
        case 'nvidia':
        case 'nim':
            return withProviderId(
                openaiProvider('https://integrate.api.nvidia.com/v1', apiKey),
                'nvidia'
            )
        case 'sambanova':
            return withProviderId(
                openaiProvider('https://api.sambanova.ai/v1', apiKey),
                'sambanova'
            )
        case 'cerebras':
            return withProviderId(openaiProvider('https://api.cerebras.ai/v1', apiKey), 'cerebras')
        case 'siliconflow':
        case 'siliconcloud':
            return withProviderId(
                openaiProvider('https://api.siliconflow.cn/v1', apiKey),
                'siliconflow'
            )
        case 'together':
        case 'togetherai':
            return withProviderId(openaiProvider('https://api.together.xyz/v1', apiKey), 'together')
        case 'hyperbolic':
            return withProviderId(
                openaiProvider('https://api.hyperbolic.xyz/v1', apiKey),
                'hyperbolic'
            )
        case 'fireworks':
        case 'fireworksai':
            return withProviderId(
                openaiProvider('https://api.fireworks.ai/inference/v1', apiKey),
                'fireworks'
            )
        case 'perplexity':
            return withProviderId(openaiProvider('https://api.perplexity.ai', apiKey), 'perplexity')
        case 'cohere':
            return withProviderId(openaiProvider('https://api.cohere.com/v2', apiKey), 'cohere')
        case 'agentrouter':
        case 'agentrouter.org':
            return withProviderId(
                openaiProvider('https://agentrouter.org/v1', apiKey, {
                    'User-Agent': 'claude-cli/2.1.0 (external, sdk-cli)',
                }),
                'agentrouter'
            )
        case 'minimax':
            return withProviderId(openaiProvider('https://api.minimax.chat/v1', apiKey), 'minimax')
        case 'arcee':
        case 'arceeai':
        case 'arcee-ai':
            return withProviderId(openaiProvider('https://api.arcee.ai/api/v1', apiKey), 'arcee')
        case 'dashscope':
        case 'qwen':
            return withProviderId(
                openaiProvider('https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey),
                'dashscope'
            )
        case 'lmstudio': {
            let endpoint = 'http://localhost:1234/v1'
            if (apiKey && (apiKey.startsWith('http://') || apiKey.startsWith('https://'))) {
                endpoint = apiKey.endsWith('/v1') ? apiKey : `${apiKey.replace(/\/+$/, '')}/v1`
            }
            return openaiProvider(endpoint, apiKey || 'lm-studio')
        }
        case 'llamacpp': {
            let endpoint = 'http://localhost:8080/v1'
            if (apiKey && (apiKey.startsWith('http://') || apiKey.startsWith('https://'))) {
                endpoint = apiKey.endsWith('/v1') ? apiKey : `${apiKey.replace(/\/+$/, '')}/v1`
            }
            return openaiProvider(endpoint, apiKey || 'llama.cpp')
        }
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
