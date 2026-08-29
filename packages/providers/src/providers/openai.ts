import { OpenAI } from 'openai'

import { createProvider } from '../models.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export function supportsReasoningEffort(model?: string, baseURL?: string): boolean {
    const name = (model || '').toLowerCase()

    // Explicit non-reasoning OpenAI models
    if (
        name === 'gpt-4o' ||
        name === 'gpt-4o-mini' ||
        name.startsWith('gpt-4') ||
        name.startsWith('gpt-3.5')
    ) {
        return false
    }

    // Mistral, Groq, Llama, Qwen, Devstral models
    if (
        name.includes('codestral') ||
        name.includes('mistral') ||
        name.includes('devstral') ||
        name.includes('ministral') ||
        name.includes('llama') ||
        name.includes('qwen')
    ) {
        return false
    }

    // If baseURL is explicitly a known non-OpenAI provider URL
    if (
        baseURL &&
        (baseURL.includes('mistral.ai') ||
            baseURL.includes('groq.com') ||
            baseURL.includes('deepseek.com') ||
            baseURL.includes('siliconflow') ||
            baseURL.includes('together.xyz') ||
            baseURL.includes('hyperbolic.xyz') ||
            baseURL.includes('cerebras.ai') ||
            baseURL.includes('sambanova.ai'))
    ) {
        return false
    }

    return true
}

export function resolveOpenAIModel(model?: string): string {
    let name = model || 'gpt-4o'
    if (name.startsWith('openai/')) {
        name = name.slice('openai/'.length)
    }
    return name
}

function normalizeErrorResponse(text: string): string {
    try {
        const data = JSON.parse(text)
        if (data && typeof data === 'object') {
            if (typeof data.error === 'string') {
                return JSON.stringify({ error: { message: data.error } })
            }
            if (!data.error) {
                const message =
                    data.message || data.detail || data.msg || data.error_msg || data.title
                if (message) {
                    return JSON.stringify({
                        error: {
                            message:
                                typeof message === 'string' ? message : JSON.stringify(message),
                            type: data.type || 'api_error',
                            code: data.code,
                        },
                    })
                }
            }
        }
    } catch {
        // Intentionally swallowed: text is not JSON
    }
    return text
}

async function providerFetch(
    url: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
): Promise<Response> {
    const res = await fetch(url, init)
    if (!res.ok) {
        const text = await res.text()
        const normalized = normalizeErrorResponse(text)
        return new Response(normalized, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
        })
    }
    return res
}

export function openaiProvider(
    baseURL?: string,
    apiKey?: string,
    defaultHeaders?: Record<string, string>,
    customClient?: OpenAI
): LLMProvider {
    const client =
        customClient ||
        new OpenAI({
            baseURL,
            apiKey: apiKey || process.env.OPENAI_API_KEY || 'dummy-key',
            defaultHeaders,
            fetch: providerFetch,
        })

    return createProvider(
        {
            id: 'openai',
            name: 'OpenAI',
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

            const thinkingLevel = modelOptions?.thinkingLevel
            let reasoningEffort: 'low' | 'medium' | 'high' | undefined
            if (thinkingLevel && thinkingLevel !== 'off' && thinkingLevel !== 'auto') {
                if (thinkingLevel === 'minimal' || thinkingLevel === 'low') {
                    reasoningEffort = 'low'
                } else if (thinkingLevel === 'medium') {
                    reasoningEffort = 'medium'
                } else if (thinkingLevel === 'high') {
                    reasoningEffort = 'high'
                }
            }

            const resolvedModel = resolveOpenAIModel(modelOptions?.model)
            const shouldSendReasoningEffort =
                reasoningEffort && supportsReasoningEffort(modelOptions?.model, baseURL)

            const createParams: any = {
                model: resolvedModel,
                messages: oaiMessages,
                tools: oaiTools,
                stream: true,
                temperature: modelOptions?.temperature,
                max_tokens: modelOptions?.max_tokens,
                stream_options: { include_usage: true },
            }
            if (shouldSendReasoningEffort) {
                createParams.reasoning_effort = reasoningEffort
            }

            let stream: any
            try {
                stream = await client.chat.completions.create({ ...createParams }, { signal })
            } catch (err: any) {
                const errMsg = (err?.message || String(err)).toLowerCase()
                if (
                    createParams.reasoning_effort &&
                    (errMsg.includes('reasoning_effort') ||
                        errMsg.includes('reasoning effort') ||
                        errMsg.includes('reasoningeffort'))
                ) {
                    delete createParams.reasoning_effort
                    stream = await client.chat.completions.create({ ...createParams }, { signal })
                } else {
                    throw err
                }
            }

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

export class OpenAIProvider implements LLMProvider {
    public id = 'openai'
    private provider: LLMProvider

    constructor(baseURL?: string, apiKey?: string, defaultHeaders?: Record<string, string>) {
        this.provider = openaiProvider(baseURL, apiKey, defaultHeaders)
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
