import { safeParseJson } from '@december/shared'
import { v4 as uuidv4 } from 'uuid'

import { createProvider } from '../models.ts'

import { sanitizeSchemaForGemini } from './gemini.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'

export const ANTIGRAVITY_DEFAULT_ENDPOINT = 'https://cloudcode-pa.googleapis.com'

export function resolveAntigravityModel(model?: string): string {
    let name = model || 'gemini-3.7-flash'
    if (name.startsWith('antigravity/')) {
        name = name.slice('antigravity/'.length)
    }
    if (name.startsWith('google/')) {
        name = name.slice('google/'.length)
    }
    if (name === 'gemini-3.1-pro') {
        return 'gemini-3-pro-preview'
    }
    return name
}

export interface AntigravityProviderOptions {
    endpoint?: string
    headers?: Record<string, string>
    projectId?: string
    fetchFn?: typeof fetch
}

export function antigravityProvider(
    token?: string,
    options?: AntigravityProviderOptions
): LLMProvider {
    const endpoint = options?.endpoint || ANTIGRAVITY_DEFAULT_ENDPOINT
    const fetchFn = options?.fetchFn || fetch
    const bearerToken =
        token ||
        process.env.ANTIGRAVITY_TOKEN ||
        process.env.GEMINI_OAUTH_TOKEN ||
        process.env.GOOGLE_OAUTH_TOKEN ||
        'dummy-key'

    return createProvider(
        {
            id: 'antigravity',
            name: 'Antigravity',
            models: [],
            api: null,
        },
        async function* (
            messages: Message[],
            tools?: ProviderTool[],
            systemPrompt?: string,
            modelOptions?: Record<string, any>,
            signal?: AbortSignal
        ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
            const antigravityMessages: any[] = []

            for (const msg of messages) {
                if (msg.role === 'tool') {
                    let name = 'unknown'
                    let extraFields: any = { id: msg.toolCallId }
                    try {
                        const parsed = safeParseJson(msg.toolCallId!)
                        if (parsed && typeof parsed === 'object') {
                            extraFields = parsed
                            if (extraFields.thoughtSignature) {
                                delete extraFields.thoughtSignature
                            }
                        }
                    } catch (e) {
                        // Intentionally swallowed: tool call ID is a raw identifier string
                    }

                    for (let i = antigravityMessages.length - 1; i >= 0; i--) {
                        const prev = antigravityMessages[i]
                        if (prev && prev.role === 'model') {
                            const call = prev.parts?.find(
                                (p: any) =>
                                    p.functionCall && (p.functionCall as any).id === extraFields.id
                            )
                            if (call && call.functionCall?.name) {
                                name = call.functionCall.name
                                break
                            }
                        }
                    }

                    antigravityMessages.push({
                        role: 'user',
                        parts: [
                            {
                                functionResponse: {
                                    ...extraFields,
                                    name: name,
                                    response: { result: msg.content },
                                },
                            },
                        ],
                    })
                } else if (msg.role === 'assistant') {
                    const parts: any[] = []
                    if (msg.content) {
                        parts.push({ text: msg.content })
                    }
                    if (msg.toolCalls && msg.toolCalls.length > 0) {
                        for (const tc of msg.toolCalls) {
                            let extraFields: any = { id: tc.id }
                            let thoughtSignature: string | undefined
                            try {
                                const parsed = safeParseJson(tc.id)
                                if (parsed && typeof parsed === 'object') {
                                    extraFields = parsed
                                    if (parsed.thoughtSignature) {
                                        thoughtSignature = parsed.thoughtSignature
                                        delete extraFields.thoughtSignature
                                    }
                                }
                            } catch (e) {
                                // Intentionally swallowed: tool call ID is a raw identifier string
                            }

                            const part: any = {
                                functionCall: {
                                    ...extraFields,
                                    name: tc.name,
                                    args: safeParseJson(tc.input || '{}'),
                                },
                            }
                            if (thoughtSignature) {
                                part.thoughtSignature = thoughtSignature
                            }
                            parts.push(part)
                        }
                    }
                    if (parts.length > 0) {
                        antigravityMessages.push({ role: 'model', parts })
                    }
                } else {
                    antigravityMessages.push({
                        role: 'user',
                        parts: [{ text: msg.content }],
                    })
                }
            }

            const antigravityTools = tools
                ? [
                      {
                          functionDeclarations: tools.map((t) => ({
                              name: t.name,
                              description: t.description,
                              parameters: sanitizeSchemaForGemini(t.inputSchema),
                          })),
                      },
                  ]
                : undefined

            const thinkingLevel = modelOptions?.thinkingLevel
            let thinkingConfig: { thinkingBudget?: number; includeThoughts?: boolean } | undefined
            if (thinkingLevel === 'off') {
                thinkingConfig = { thinkingBudget: 0 }
            } else if (thinkingLevel && thinkingLevel !== 'auto') {
                const budgetMap: Record<string, number> = {
                    minimal: 1024,
                    low: 2048,
                    medium: 4096,
                    high: 8192,
                }
                const budget = budgetMap[thinkingLevel]
                if (budget !== undefined) {
                    thinkingConfig = { thinkingBudget: budget, includeThoughts: true }
                } else {
                    thinkingConfig = { includeThoughts: true }
                }
            } else {
                thinkingConfig = { includeThoughts: true }
            }

            const DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 65536
            let maxOutputTokens = modelOptions?.max_tokens || DEFAULT_GEMINI_MAX_OUTPUT_TOKENS
            if (thinkingConfig?.thinkingBudget && thinkingConfig.thinkingBudget > 0) {
                maxOutputTokens = Math.max(maxOutputTokens, thinkingConfig.thinkingBudget + 16384)
            }

            const requestBody: Record<string, any> = {
                model: resolveAntigravityModel(modelOptions?.model),
                contents: antigravityMessages,
                ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
                ...(antigravityTools ? { tools: antigravityTools } : {}),
                generationConfig: {
                    temperature: modelOptions?.temperature,
                    maxOutputTokens,
                    thinkingConfig,
                },
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                Authorization: `Bearer ${bearerToken}`,
                'User-Agent': 'google-antigravity-cli/1.0',
                ...(options?.projectId ? { 'x-goog-user-project': options.projectId } : {}),
                ...(options?.headers || {}),
            }

            const targetUrl = `${endpoint.replace(/\/+$/, '')}/v1internal:streamGenerateContent?alt=sse`
            const response = await fetchFn(targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal,
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => '')
                let parsedMessage = errorText
                try {
                    const parsedJson = JSON.parse(errorText)
                    parsedMessage = parsedJson?.error?.message || parsedJson?.message || errorText
                } catch {
                    // Intentionally swallowed: fallback to raw errorText
                }
                throw new Error(`Antigravity API error (${response.status}): ${parsedMessage}`)
            }

            let totalPromptTokens = 0
            let totalCompletionTokens = 0

            if (!response.body) {
                return
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let buffer = ''

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

                        const jsonStr = trimmed.slice('data:'.length).trim()
                        if (!jsonStr || jsonStr === '[DONE]') continue

                        let chunk: any
                        try {
                            chunk = JSON.parse(jsonStr)
                        } catch {
                            // Intentionally swallowed: ignore malformed SSE line chunk
                            continue
                        }

                        if (chunk.usageMetadata) {
                            totalPromptTokens =
                                chunk.usageMetadata.promptTokenCount || totalPromptTokens
                            totalCompletionTokens =
                                chunk.usageMetadata.candidatesTokenCount || totalCompletionTokens
                        }

                        const candidate = chunk.candidates?.[0]
                        const parts = candidate?.content?.parts || []
                        let chunkText = ''

                        for (const part of parts) {
                            if ((part as any).thought || (part as any).thoughtText) {
                                const thoughtContent = (part as any).thoughtText || part.text || ''
                                if (thoughtContent) {
                                    yield { type: 'thinking_delta', text: thoughtContent }
                                }
                            } else if (part.text && typeof part.text === 'string') {
                                chunkText += part.text
                            }
                        }

                        if (chunkText) {
                            yield { type: 'text', text: chunkText }
                        }

                        for (const part of parts) {
                            if (part.functionCall) {
                                const fc = part.functionCall
                                const extraFields: any = {}

                                if ((fc as any).id) {
                                    extraFields.id = (fc as any).id
                                } else {
                                    extraFields.id = uuidv4()
                                }

                                if ((part as any).thoughtSignature) {
                                    extraFields.thoughtSignature = (part as any).thoughtSignature
                                }

                                const id = JSON.stringify(extraFields)
                                yield {
                                    type: 'tool_call_delta',
                                    id,
                                    name: fc.name,
                                    inputDelta: JSON.stringify(fc.args || {}),
                                }
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock()
            }

            if (totalPromptTokens > 0 || totalCompletionTokens > 0) {
                yield {
                    type: 'usage',
                    promptTokens: totalPromptTokens,
                    completionTokens: totalCompletionTokens,
                }
            }
        }
    )
}

export class AntigravityProvider implements LLMProvider {
    public id = 'antigravity'
    private provider: LLMProvider

    constructor(token?: string, options?: AntigravityProviderOptions) {
        this.provider = antigravityProvider(token, options)
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
