import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export const CODEX_DEFAULT_ENDPOINT = 'https://chatgpt.com/backend-api'

export const CODEX_SUPPORTED_MODELS = [
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.5',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
] as const

export function resolveCodexModel(model?: string): string {
    let name = (model || '').toLowerCase().trim()
    if (name.startsWith('codex/')) {
        name = name.slice('codex/'.length)
    }
    if (name.startsWith('openai/')) {
        name = name.slice('openai/'.length)
    }

    if (CODEX_SUPPORTED_MODELS.includes(name as any)) {
        return name
    }

    if (name.includes('5.5')) return 'gpt-5.5'
    if (name.includes('5.6-sol') || name.includes('sol')) return 'gpt-5.6-sol'
    if (name.includes('5.6-terra') || name.includes('terra')) return 'gpt-5.6-terra'
    if (name.includes('5.6-luna') || name.includes('luna')) return 'gpt-5.6-luna'
    if (name.includes('mini')) return 'gpt-5.4-mini'

    return 'gpt-5.4'
}

export function extractChatGPTAccountId(token: string): string | undefined {
    try {
        const parts = token.split('.')
        const payloadPart = parts[1]
        if (parts.length === 3 && payloadPart) {
            const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf-8'))
            return payload['https://api.openai.com/auth']?.chatgpt_account_id
        }
    } catch {
        // Intentionally swallowed: token is not a valid base64url JWT
    }
    return undefined
}

export interface CodexProviderOptions {
    endpoint?: string
    accountId?: string
    headers?: Record<string, string>
    fetchFn?: typeof fetch
}

export function codexResponsesProvider(
    token?: string,
    options?: CodexProviderOptions
): LLMProvider {
    const rawEndpoint = options?.endpoint || CODEX_DEFAULT_ENDPOINT
    const endpoint = rawEndpoint.replace(/\/+$/, '')
    const targetUrl = endpoint.endsWith('/codex/responses')
        ? endpoint
        : endpoint.endsWith('/codex')
          ? `${endpoint}/responses`
          : `${endpoint}/codex/responses`

    const bearerToken =
        token ||
        process.env.OPENAI_OAUTH_TOKEN ||
        process.env.CODEX_TOKEN ||
        process.env.OPENAI_CODEX_TOKEN ||
        'dummy-token'

    const accountId = options?.accountId || extractChatGPTAccountId(bearerToken)
    const fetchFn = options?.fetchFn || fetch

    return {
        id: 'codex',
        async *stream(
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
            const resolvedModel = resolveCodexModel(modelOptions?.model)

            const input: any[] = []
            for (const msg of messages) {
                if (msg.role === 'tool') {
                    input.push({
                        type: 'function_call_output',
                        call_id: msg.toolCallId || 'call_default',
                        output: msg.content,
                    })
                } else if (msg.role === 'assistant') {
                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        for (const tc of msg.toolCalls) {
                            input.push({
                                type: 'function_call',
                                call_id: tc.id,
                                name: tc.name,
                                arguments: tc.input || '',
                            })
                        }
                    }
                    if (msg.content) {
                        input.push({
                            type: 'message',
                            role: 'assistant',
                            content: [{ type: 'output_text', text: msg.content }],
                        })
                    }
                } else {
                    input.push({
                        type: 'message',
                        role: 'user',
                        content: [{ type: 'input_text', text: msg.content }],
                    })
                }
            }

            const requestBody: any = {
                model: resolvedModel,
                store: false,
                stream: true,
                instructions: systemPrompt || 'You are a helpful assistant.',
                input,
            }

            if (tools && tools.length > 0) {
                requestBody.tools = tools.map((t) => ({
                    type: 'function',
                    name: t.name,
                    description: t.description || '',
                    parameters: t.inputSchema || { type: 'object', properties: {} },
                }))
            }

            const thinkingLevel = modelOptions?.thinkingLevel
            if (thinkingLevel && thinkingLevel !== 'off') {
                requestBody.reasoning = {
                    effort:
                        thinkingLevel === 'high'
                            ? 'high'
                            : thinkingLevel === 'minimal' || thinkingLevel === 'low'
                              ? 'low'
                              : 'medium',
                    summary: 'auto',
                }
            }

            const headers: Record<string, string> = {
                Authorization: `Bearer ${bearerToken}`,
                'OpenAI-Beta': 'responses=experimental',
                accept: 'text/event-stream',
                'content-type': 'application/json',
                originator: 'december',
                'User-Agent': 'december-cli/0.3.22',
                ...(options?.headers || {}),
            }

            if (accountId) {
                headers['chatgpt-account-id'] = accountId
            }

            const response = await fetchFn(targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal,
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => '')
                let errorMessage = `Codex request failed with status ${response.status}: ${response.statusText}`
                try {
                    const errorJson = JSON.parse(errorText)
                    if (errorJson.error?.message) {
                        errorMessage = errorJson.error.message
                        if (errorJson.error.plan_type) {
                            errorMessage += ` (plan: ${errorJson.error.plan_type})`
                        }
                        if (errorJson.error.resets_in_seconds) {
                            const hours = Math.ceil(errorJson.error.resets_in_seconds / 3600)
                            errorMessage += ` - resets in approx ${hours}h`
                        }
                    } else if (errorJson.detail) {
                        errorMessage = errorJson.detail
                    }
                } catch {
                    // Intentionally swallowed: fallback to formatted raw error message
                }
                throw new Error(errorMessage)
            }

            if (!response.body) {
                throw new Error('Codex response has no body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            interface ActiveToolCall {
                id: string
                name: string
                input: string
                completed: boolean
            }
            const activeToolCalls = new Map<number | string, ActiveToolCall>()

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        const trimmed = line.trim()
                        if (!trimmed.startsWith('data:')) continue

                        const dataStr = trimmed.slice(5).trim()
                        if (dataStr === '[DONE]') return

                        let event: any
                        try {
                            event = JSON.parse(dataStr)
                        } catch {
                            // Intentionally swallowed: ignore unparseable SSE line
                            continue
                        }

                        if (!event || !event.type) continue

                        if (event.type === 'response.output_text.delta' && event.delta) {
                            yield { type: 'text', text: event.delta }
                        } else if (
                            (event.type === 'response.reasoning_text.delta' ||
                                event.type === 'response.reasoning_summary_text.delta') &&
                            event.delta
                        ) {
                            yield { type: 'thinking_delta', text: event.delta }
                        } else if (
                            event.type === 'response.output_item.added' &&
                            event.item?.type === 'function_call'
                        ) {
                            const slotKey = event.output_index ?? event.item.id ?? 'default'
                            activeToolCalls.set(slotKey, {
                                id: event.item.call_id || event.item.id || 'call_default',
                                name: event.item.name || '',
                                input: event.item.arguments || '',
                                completed: false,
                            })
                        } else if (event.type === 'response.function_call_arguments.delta') {
                            const slotKey = event.output_index ?? 'default'
                            const tc = activeToolCalls.get(slotKey)
                            if (tc && event.delta) {
                                tc.input += event.delta
                                yield {
                                    type: 'tool_call_delta',
                                    id: tc.id,
                                    name: tc.name,
                                    inputDelta: event.delta,
                                }
                            }
                        } else if (
                            event.type === 'response.function_call_arguments.done' ||
                            (event.type === 'response.output_item.done' &&
                                event.item?.type === 'function_call')
                        ) {
                            const slotKey = event.output_index ?? event.item?.id ?? 'default'
                            const tc = activeToolCalls.get(slotKey)
                            if (tc && !tc.completed) {
                                tc.completed = true
                                yield {
                                    type: 'tool_call',
                                    toolCall: {
                                        id: tc.id,
                                        name: tc.name,
                                        input: tc.input,
                                    },
                                }
                            }
                        } else if (event.type === 'response.completed') {
                            const usage = event.response?.usage
                            if (usage) {
                                yield {
                                    type: 'usage',
                                    promptTokens: usage.input_tokens || 0,
                                    completionTokens: usage.output_tokens || 0,
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock()
            }
        },
    }
}

export class CodexProvider implements LLMProvider {
    public id = 'codex'
    private provider: LLMProvider

    constructor(token?: string, options?: CodexProviderOptions) {
        this.provider = codexResponsesProvider(token, options)
    }

    stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
        return this.provider.stream(messages, tools, systemPrompt, modelOptions, signal)
    }
}
