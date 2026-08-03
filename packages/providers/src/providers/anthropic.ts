import Anthropic from '@anthropic-ai/sdk'
import { safeParseJson } from '@december/shared'

import { createProvider } from '../models.ts'
import { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export function anthropicProvider(
    baseURL?: string,
    apiKey?: string,
    customClient?: Anthropic
): LLMProvider {
    const client =
        customClient ||
        new Anthropic({
            baseURL,
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        })

    return createProvider(
        {
            id: 'anthropic',
            name: 'Anthropic',
            models: [],
            api: client,
        },
        async function* (
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
            const antMessages: Anthropic.MessageParam[] = []

            for (const msg of messages) {
                if (msg.role === 'tool') {
                    antMessages.push({
                        role: 'user',
                        content: [
                            {
                                type: 'tool_result',
                                tool_use_id: msg.toolCallId!,
                                content: msg.content,
                            },
                        ],
                    })
                } else if (msg.role === 'assistant') {
                    const content: Anthropic.ContentBlockParam[] = []
                    if (msg.content) {
                        content.push({ type: 'text', text: msg.content })
                    }
                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        for (const tc of msg.toolCalls) {
                            content.push({
                                type: 'tool_use',
                                id: tc.id,
                                name: tc.name,
                                input: safeParseJson(tc.input || '{}'),
                            })
                        }
                    }
                    if (content.length > 0) {
                        antMessages.push({ role: 'assistant', content })
                    }
                } else {
                    antMessages.push({
                        role: msg.role as 'user',
                        content: [
                            {
                                type: 'text',
                                text: msg.content,
                            },
                        ],
                    })
                }
            }

            // Apply ephemeral prompt caching directive to the last message turn
            if (antMessages.length > 0) {
                const lastMsg = antMessages[antMessages.length - 1]
                if (typeof lastMsg.content === 'string') {
                    lastMsg.content = [
                        {
                            type: 'text',
                            text: lastMsg.content,
                            cache_control: { type: 'ephemeral' },
                        },
                    ]
                } else if (Array.isArray(lastMsg.content) && lastMsg.content.length > 0) {
                    const lastBlock = lastMsg.content[lastMsg.content.length - 1]
                    if (lastBlock && typeof lastBlock === 'object') {
                        ;(lastBlock as any).cache_control = { type: 'ephemeral' }
                    }
                }
            }

            const antTools: Anthropic.Tool[] | undefined = tools?.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema,
            }))

            const formattedSystem: Anthropic.TextBlockParam[] | undefined = systemPrompt
                ? [
                      {
                          type: 'text',
                          text: systemPrompt,
                          cache_control: { type: 'ephemeral' },
                      },
                  ]
                : undefined

            const thinkingLevel = modelOptions?.thinkingLevel
            let thinking: { type: 'enabled'; budget_tokens: number } | undefined
            let maxTokens = modelOptions?.max_tokens || 4096

            if (thinkingLevel && thinkingLevel !== 'off') {
                const budgetMap: Record<string, number> = {
                    minimal: 1024,
                    low: 2048,
                    medium: 4096,
                    high: 8192,
                }
                const budget = budgetMap[thinkingLevel]
                if (budget) {
                    thinking = { type: 'enabled', budget_tokens: budget }
                    maxTokens = Math.max(maxTokens, budget + 1024)
                }
            }

            const stream = await client.messages.create(
                {
                    model: modelOptions?.model || 'claude-3-5-sonnet-20241022',
                    messages: antMessages,
                    system: formattedSystem as any,
                    tools: antTools,
                    stream: true,
                    max_tokens: maxTokens,
                    temperature: thinking ? undefined : modelOptions?.temperature,
                    thinking: thinking as any,
                },
                { signal }
            )

            const activeToolCalls = new Map<number, string>()

            let promptTokens = 0
            let completionTokens = 0

            for await (const event of stream) {
                if (event.type === 'message_start' && event.message.usage) {
                    promptTokens += event.message.usage.input_tokens
                } else if (event.type === 'message_delta' && event.usage) {
                    completionTokens += event.usage.output_tokens
                }

                if (event.type === 'content_block_start') {
                    if (event.content_block.type === 'tool_use') {
                        activeToolCalls.set(event.index, event.content_block.id)
                        yield {
                            type: 'tool_call_delta',
                            id: event.content_block.id,
                            name: event.content_block.name,
                            inputDelta: '',
                        }
                    }
                } else if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        yield { type: 'text', text: event.delta.text }
                    } else if (event.delta.type === 'thinking_delta') {
                        yield { type: 'thinking_delta', text: (event.delta as any).thinking }
                    } else if (event.delta.type === 'input_json_delta') {
                        const id = activeToolCalls.get(event.index)
                        if (id) {
                            yield {
                                type: 'tool_call_delta',
                                id,
                                inputDelta: event.delta.partial_json,
                            }
                        }
                    }
                }
            }

            if (promptTokens > 0 || completionTokens > 0) {
                yield { type: 'usage', promptTokens, completionTokens }
            }
        }
    )
}

export class AnthropicProvider implements LLMProvider {
    public id = 'anthropic'
    private provider: LLMProvider

    constructor(arg1?: string, arg2?: string) {
        let baseURL: string | undefined
        let apiKey: string | undefined
        if (arg1 === undefined) {
            apiKey = arg2
        } else if (arg1 && arg1.startsWith('http')) {
            baseURL = arg1
            apiKey = arg2
        } else {
            apiKey = arg1
        }
        this.provider = anthropicProvider(baseURL, apiKey)
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
