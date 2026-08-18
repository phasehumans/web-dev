import { OpenAI } from 'openai'

import { createProvider, getModelContextWindow } from '../models.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export function resolveOllamaModel(model?: string): string {
    let name = model || 'qwen2.5-coder:7b'
    if (name.startsWith('ollama/')) {
        name = name.slice('ollama/'.length)
    }
    return name
}

export function ollamaProvider(
    baseURL: string = 'http://localhost:11434/v1',
    apiKey: string = 'ollama',
    defaultNumCtx?: number,
    customClient?: OpenAI
): LLMProvider {
    const client =
        customClient ||
        new OpenAI({
            baseURL,
            apiKey: apiKey || 'ollama',
        })

    return createProvider(
        {
            id: 'ollama',
            name: 'Ollama',
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
            const oaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []

            if (systemPrompt) {
                oaiMessages.push({ role: 'system', content: systemPrompt })
            }

            for (const msg of messages) {
                if (msg.role === 'tool') {
                    oaiMessages.push({
                        role: 'tool',
                        tool_call_id: msg.toolCallId!,
                        content: msg.content,
                    })
                } else if (msg.role === 'assistant') {
                    const asstMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
                        role: 'assistant',
                        content: msg.content,
                    }
                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        asstMsg.tool_calls = msg.toolCalls.map((tc) => ({
                            id: tc.id,
                            type: 'function',
                            function: {
                                name: tc.name,
                                arguments: tc.input,
                            },
                        }))
                    }
                    oaiMessages.push(asstMsg)
                } else {
                    oaiMessages.push({
                        role: msg.role as 'user' | 'system',
                        content: msg.content,
                    })
                }
            }

            const oaiTools: OpenAI.Chat.ChatCompletionTool[] | undefined = tools?.map((t) => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema,
                },
            }))

            const resolvedModel = resolveOllamaModel(modelOptions?.model)
            const numCtx =
                modelOptions?.numCtx ?? defaultNumCtx ?? getModelContextWindow(resolvedModel)

            const stream = await client.chat.completions.create(
                {
                    model: resolvedModel,
                    messages: oaiMessages,
                    tools: oaiTools && oaiTools.length > 0 ? oaiTools : undefined,
                    stream: true,
                    temperature: modelOptions?.temperature,
                    max_tokens: modelOptions?.max_tokens,
                    stream_options: { include_usage: true },
                    options: {
                        num_ctx: numCtx,
                    },
                } as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
                { signal }
            )

            const activeToolCalls = new Map<number, string>()

            for await (const chunk of stream) {
                if (chunk.usage) {
                    yield {
                        type: 'usage',
                        promptTokens: chunk.usage.prompt_tokens,
                        completionTokens: chunk.usage.completion_tokens,
                    }
                }

                if (!chunk.choices || chunk.choices.length === 0) continue

                const choice = chunk.choices[0]
                if (!choice) continue

                const reasoning =
                    (choice.delta as any).reasoning_content ||
                    (choice.delta as any).reasoning ||
                    (choice.delta as any).thought ||
                    (choice.delta as any).thinking

                if (reasoning && typeof reasoning === 'string') {
                    yield { type: 'thinking_delta', text: reasoning }
                }

                if (choice.delta.content) {
                    yield { type: 'text', text: choice.delta.content }
                }

                if (choice.delta.tool_calls) {
                    for (const tc of choice.delta.tool_calls) {
                        if (tc.id) {
                            activeToolCalls.set(tc.index, tc.id)
                            yield {
                                type: 'tool_call_delta',
                                id: tc.id,
                                name: tc.function?.name,
                                inputDelta: tc.function?.arguments || '',
                            }
                        } else if (tc.index !== undefined) {
                            const id = activeToolCalls.get(tc.index)
                            if (id) {
                                yield {
                                    type: 'tool_call_delta',
                                    id,
                                    inputDelta: tc.function?.arguments || '',
                                }
                            }
                        }
                    }
                }
            }
        }
    )
}

export class OllamaProvider implements LLMProvider {
    public id = 'ollama'
    private provider: LLMProvider

    constructor(
        baseURL: string = 'http://localhost:11434/v1',
        apiKey: string = 'ollama',
        numCtx?: number
    ) {
        this.provider = ollamaProvider(baseURL, apiKey, numCtx)
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
