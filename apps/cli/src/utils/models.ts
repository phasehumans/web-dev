export const getProviderModels = (provider: string) => {
    switch (provider) {
        case 'anthropic':
            return [
                { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-latest' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
                { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
                { label: 'Claude 3 Opus', value: 'claude-3-opus-latest' },
                { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
            ]
        case 'google':
            return [
                { label: 'Gemini 3.6 Flash', value: 'gemini-3.6-flash' },
                { label: 'Gemini 3.5 Flash', value: 'gemini-3.5-flash' },
                { label: 'Gemini 3.5 Flash Lite', value: 'gemini-3.5-flash-lite' },
                { label: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro' },
                { label: 'Gemini 3 Pro Preview', value: 'gemini-3-pro-preview' },
                { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
                { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
                { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
                { label: 'Gemini 2.0 Flash Lite', value: 'gemini-2.0-flash-lite' },
                { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
                { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
            ]
        case 'openai':
            return [
                { label: 'o3-mini', value: 'o3-mini' },
                { label: 'o1', value: 'o1' },
                { label: 'o1-mini', value: 'o1-mini' },
                { label: 'GPT-4.5 Preview', value: 'gpt-4.5-preview' },
                { label: 'GPT-4o', value: 'gpt-4o' },
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
            ]
        case 'openrouter':
            return [
                { label: 'Google: Gemini 3.6 Flash', value: 'google/gemini-3.6-flash' },
                { label: 'Anthropic: Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
                { label: 'Anthropic: Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
                { label: 'OpenAI: o3-mini', value: 'openai/o3-mini' },
                { label: 'OpenAI: GPT-4o', value: 'openai/gpt-4o' },
                { label: 'DeepSeek: DeepSeek R1', value: 'deepseek/deepseek-r1' },
                { label: 'DeepSeek: DeepSeek V3', value: 'deepseek/deepseek-chat' },
                { label: 'Meta: Llama 3.3 70B', value: 'meta-llama/llama-3.3-70b-instruct' },
            ]
        case 'deepseek':
            return [
                { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
                { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
                { label: 'DeepSeek Chat (V3)', value: 'deepseek-chat' },
                { label: 'DeepSeek Reasoner (R1)', value: 'deepseek-reasoner' },
                { label: 'DeepSeek Coder', value: 'deepseek-coder' },
            ]
        case 'groq':
            return [
                { label: 'Llama 3.3 70B Versatile', value: 'llama-3.3-70b-versatile' },
                { label: 'Llama 3.1 8B Instant', value: 'llama-3.1-8b-instant' },
                { label: 'DeepSeek R1 Distill 70B', value: 'deepseek-r1-distill-llama-70b' },
                { label: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768' },
            ]
        case 'huggingface':
            return [
                { label: 'Llama 3.3 70B Instruct', value: 'meta-llama/Llama-3.3-70B-Instruct' },
                { label: 'Llama 3 8B Instruct', value: 'meta-llama/Meta-Llama-3-8B-Instruct' },
                { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
            ]
        case 'kimi':
        case 'moonshoot':
            return [
                { label: 'Moonshot v1 8K', value: 'moonshot-v1-8k' },
                { label: 'Moonshot v1 32K', value: 'moonshot-v1-32k' },
                { label: 'Moonshot v1 128K', value: 'moonshot-v1-128k' },
                { label: 'Kimi K1.5', value: 'kimi-k1.5' },
            ]
        case 'mistral':
            return [
                { label: 'Mistral Large', value: 'mistral-large-latest' },
                { label: 'Mistral Medium', value: 'mistral-medium-latest' },
                { label: 'Mistral Small', value: 'mistral-small-latest' },
                { label: 'Codestral', value: 'codestral-latest' },
                { label: 'Pixtral Large', value: 'pixtral-large-latest' },
            ]
        case 'xai':
            return [
                { label: 'Grok 4.5', value: 'grok-4.5' },
                { label: 'Grok 2', value: 'grok-2-latest' },
                { label: 'Grok 2 Vision', value: 'grok-2-vision-1212' },
                { label: 'Grok Beta', value: 'grok-beta' },
            ]
        case 'zai':
            return [
                { label: 'ZAI v1', value: 'zai-v1' },
                { label: 'GLM 4', value: 'glm-4' },
            ]
        default:
            return [{ label: 'Default', value: 'default' }]
    }
}

export const getModelLabel = (value: string) => {
    const allProviders = [
        'anthropic',
        'google',
        'openai',
        'openrouter',
        'deepseek',
        'groq',
        'huggingface',
        'kimi',
        'mistral',
        'xai',
        'zai',
    ]
    for (const p of allProviders) {
        const models = getProviderModels(p)
        const found = models.find((m) => m.value === value)
        if (found) return found.label
    }
    return value
}

import { getModelContextWindow } from '@december/providers'
export { getModelContextWindow }
