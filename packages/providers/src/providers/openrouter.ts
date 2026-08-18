import { openaiProvider } from './openai.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export const OPENROUTER_DEFAULT_MAX_TOKENS = 4096
export const OPENROUTER_MIN_AFFORDABLE_TOKENS = 50

export function openrouterProvider(apiKey?: string): LLMProvider {
    const key = apiKey || process.env.OPENROUTER_API_KEY

    const baseProvider = openaiProvider('https://openrouter.ai/api/v1', key, {
        'HTTP-Referer': 'https://trydecember.com',
        'X-Title': 'December',
    })

    return {
        ...baseProvider,
        id: 'openrouter',
        stream: async function* (
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
            const requestedMaxTokens = modelOptions?.max_tokens || OPENROUTER_DEFAULT_MAX_TOKENS
            const options = {
                ...modelOptions,
                max_tokens: requestedMaxTokens,
            }

            let hasYielded = false
            try {
                const stream = baseProvider.stream(messages, tools, systemPrompt, options, signal)
                for await (const chunk of stream) {
                    hasYielded = true
                    yield chunk
                }
            } catch (err: any) {
                const errMsg = err?.message || String(err)
                const is402 =
                    err?.status === 402 ||
                    errMsg.includes('402') ||
                    errMsg.toLowerCase().includes('requires more credits') ||
                    errMsg.toLowerCase().includes('can only afford')

                if (is402 && !hasYielded) {
                    const match =
                        errMsg.match(/can only afford (\d+)/i) || errMsg.match(/afford (\d+)/i)
                    if (match && match[1]) {
                        const affordableTokens = parseInt(match[1], 10)
                        if (affordableTokens >= OPENROUTER_MIN_AFFORDABLE_TOKENS) {
                            const clampedMaxTokens = Math.min(
                                options.max_tokens || OPENROUTER_DEFAULT_MAX_TOKENS,
                                Math.max(1, Math.floor(affordableTokens * 0.95))
                            )
                            const retryOptions = {
                                ...options,
                                max_tokens: clampedMaxTokens,
                            }
                            try {
                                const retryStream = baseProvider.stream(
                                    messages,
                                    tools,
                                    systemPrompt,
                                    retryOptions,
                                    signal
                                )
                                for await (const chunk of retryStream) {
                                    yield chunk
                                }
                                return
                            } catch (retryErr: any) {
                                throw new Error(
                                    `OpenRouter credits exhausted or insufficient. Please add credits at https://openrouter.ai/settings/credits: ${retryErr?.message || String(retryErr)}`,
                                    { cause: retryErr }
                                )
                            }
                        }
                    }
                    throw new Error(
                        `OpenRouter credits exhausted or insufficient. Please add credits at https://openrouter.ai/settings/credits: ${errMsg}`,
                        { cause: err }
                    )
                }

                throw err
            }
        },
    }
}
