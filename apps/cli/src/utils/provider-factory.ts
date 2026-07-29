import {
    openaiProvider,
    anthropicProvider,
    geminiProvider,
    openrouterProvider,
} from '@december/providers'

export function instantiateProvider(provider: string, apiKey: string): any {
    switch (provider) {
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
        case 'moonshot':
            return openaiProvider('https://api.moonshot.cn/v1', apiKey)
        case 'mistral':
            return openaiProvider('https://api.mistral.ai/v1', apiKey)
        case 'xai':
            return openaiProvider('https://api.x.ai/v1', apiKey)
        case 'zai':
            return openaiProvider('https://api.zai.ai/v1', apiKey)
        default: {
            if (process.env.SERVER_PORT) {
                return openaiProvider(`http://localhost:${process.env.SERVER_PORT}/api/v1`, apiKey)
            }
            const serverUrl = process.env.SERVER_URL || 'https://api.trydecember.com'
            const proxyUrl = `${serverUrl}/api/v1/cli`
            return openaiProvider(proxyUrl, apiKey)
        }
    }
}
