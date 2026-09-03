import { openaiProvider } from './openai.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export const COPILOT_DEFAULT_ENDPOINT = 'https://api.individual.githubcopilot.com'

export function resolveCopilotModel(model?: string): string {
    let name = (model || '').toLowerCase().trim()
    if (name.startsWith('copilot/')) {
        name = name.slice('copilot/'.length)
    }
    if (
        !name ||
        name.startsWith('claude') ||
        name.startsWith('gemini') ||
        name.startsWith('o1') ||
        name.startsWith('o3') ||
        name.startsWith('glm') ||
        name.startsWith('deepseek')
    ) {
        return 'gpt-4o'
    }
    if (name.includes('mini')) {
        return 'gpt-4o-mini'
    }
    if (name.startsWith('gpt-4')) {
        return name
    }
    return 'gpt-4o'
}

export interface CopilotProviderOptions {
    endpoint?: string
    headers?: Record<string, string>
    editorVersion?: string
    pluginVersion?: string
    integrationId?: string
    customClient?: any
}

export function copilotProvider(token?: string, options?: CopilotProviderOptions): LLMProvider {
    const endpoint = options?.endpoint || COPILOT_DEFAULT_ENDPOINT
    const bearerToken =
        token || process.env.COPILOT_TOKEN || process.env.GITHUB_COPILOT_TOKEN || 'dummy-key'

    const copilotHeaders: Record<string, string> = {
        'Editor-Version': options?.editorVersion || 'vscode/1.95.0',
        'Editor-Plugin-Version': options?.pluginVersion || 'copilot/1.240.0',
        'Copilot-Integration-Id': options?.integrationId || 'vscode-chat',
        'User-Agent': `GithubCopilot/${options?.pluginVersion || '1.240.0'}`,
        Accept: 'application/json',
        ...(options?.headers || {}),
    }

    const underlying = openaiProvider(endpoint, bearerToken, copilotHeaders, options?.customClient)

    return {
        id: 'copilot',
        async *stream(
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
            const mappedOptions = {
                ...modelOptions,
                model: resolveCopilotModel(modelOptions?.model),
            }

            yield* underlying.stream(messages, tools, systemPrompt, mappedOptions, signal)
        },
    }
}

export class CopilotProvider implements LLMProvider {
    public id = 'copilot'
    private provider: LLMProvider

    constructor(token?: string, options?: CopilotProviderOptions) {
        this.provider = copilotProvider(token, options)
    }

    stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ) {
        return this.provider.stream(messages, tools, systemPrompt, modelOptions, signal)
    }
}
