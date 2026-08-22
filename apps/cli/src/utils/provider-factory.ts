import {
    openaiProvider,
    anthropicProvider,
    geminiProvider,
    openrouterProvider,
    ollamaProvider,
} from '@december/providers'

export function instantiateProvider(provider: string, apiKey: string): any {
    const normalized = (provider || '').toLowerCase().trim()
    switch (normalized) {
        case 'openai':
            return openaiProvider(undefined, apiKey)
        case 'anthropic':
            return anthropicProvider(undefined, apiKey)
        case 'gemini':
        case 'google':
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
            return openaiProvider('https://api.moonshot.cn/v1', apiKey)
        case 'mistral':
            return openaiProvider('https://api.mistral.ai/v1', apiKey)
        case 'xai':
            return openaiProvider('https://api.x.ai/v1', apiKey)
        case 'zai':
            return openaiProvider('https://api.zai.ai/v1', apiKey)
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
            if (process.env.NODE_ENV !== 'production' && process.env.SERVER_PORT) {
                return openaiProvider(`http://localhost:${process.env.SERVER_PORT}/api/v1`, apiKey)
            }
            const serverUrl = process.env.SERVER_URL || 'https://api.trydecember.com'
            const proxyUrl = `${serverUrl.replace(/\/+$/, '')}/api/v1/cli`
            return openaiProvider(proxyUrl, apiKey)
        }
    }
}
