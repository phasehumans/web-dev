import { AnthropicProvider } from './anthropic.ts'

import type { Message, ProviderTool } from '../types.ts'

export function resolveKimiModel(model?: string): string {
    let name = model || 'k3'
    if (name.startsWith('kimi/')) {
        name = name.slice('kimi/'.length)
    }
    const aliasMap: Record<string, string> = {
        'kimi-k3': 'k3',
        k3: 'k3',
        'k3-256k': 'k3-256k',
        'kimi-for-coding': 'kimi-for-coding',
        'kimi-k2.7-code': 'kimi-for-coding',
        'kimi-k2.7-code-highspeed': 'kimi-for-coding-highspeed',
        'kimi-for-coding-highspeed': 'kimi-for-coding-highspeed',
        'kimi-k2.6': 'k3',
        'kimi-k2.5': 'k3',
    }
    return aliasMap[name] || name
}

export class KimiProvider extends AnthropicProvider {
    public override id = 'kimi'

    constructor(apiKey?: string) {
        super('https://api.kimi.com/coding', apiKey || process.env.KIMI_API_KEY)
    }

    public override stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ) {
        const mappedOptions = {
            ...modelOptions,
            model: resolveKimiModel(modelOptions?.model),
        }
        return super.stream(messages, tools, systemPrompt, mappedOptions, signal)
    }
}
