import { safeParseJson } from '@december/shared'
import { GoogleGenAI } from '@google/genai'
import { v4 as uuidv4 } from 'uuid'

import { createProvider } from '../models.ts'

import type { LLMProvider, Message, ProviderStreamChunk, ProviderTool } from '../types.ts'
import type { Content } from '@google/genai'

export function sanitizeSchemaForGemini(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema

    const result = { ...schema }

    if (Array.isArray(result.anyOf)) {
        const isAllConsts = result.anyOf.every(
            (item: any) => item && typeof item === 'object' && 'const' in item
        )
        if (isAllConsts) {
            result.enum = result.anyOf.map((item: any) => item.const)
            delete result.anyOf
        } else {
            result.anyOf = result.anyOf.map((item: any) => sanitizeSchemaForGemini(item))
        }
    }

    if ('const' in result) {
        result.enum = [result.const]
        delete result.const
    }

    for (const key in result) {
        if (
            typeof result[key] === 'object' &&
            result[key] !== null &&
            !Array.isArray(result[key])
        ) {
            result[key] = sanitizeSchemaForGemini(result[key])
        } else if (Array.isArray(result[key])) {
            result[key] = result[key].map((item: any) =>
                typeof item === 'object' && item !== null ? sanitizeSchemaForGemini(item) : item
            )
        }
    }

    return result
}

export function resolveGeminiModel(model?: string): string {
    let name = model || 'gemini-3.6-flash'
    if (name.startsWith('google/')) {
        name = name.slice('google/'.length)
    }
    if (name === 'gemini-3.1-pro') {
        return 'gemini-3-pro-preview'
    }
    return name
}

export function geminiProvider(apiKey?: string, customClient?: GoogleGenAI): LLMProvider {
    const client =
        customClient ||
        new GoogleGenAI({
            apiKey: apiKey || process.env.GEMINI_API_KEY || 'dummy-key',
        })

    return createProvider(
        {
            id: 'gemini',
            name: 'Gemini',
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
            const geminiMessages: Content[] = []

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
                        console.warn('[gemini provider] failed to parse toolCallId:', e)
                    }

                    for (let i = geminiMessages.length - 1; i >= 0; i--) {
                        const prev = geminiMessages[i]
                        if (prev && prev.role === 'model') {
                            const call = prev.parts?.find(
                                (p) =>
                                    p.functionCall && (p.functionCall as any).id === extraFields.id
                            )
                            if (call && call.functionCall?.name) {
                                name = call.functionCall.name
                                break
                            }
                        }
                    }

                    geminiMessages.push({
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
                                console.warn('[gemini provider] failed to parse tool call id:', e)
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
                        geminiMessages.push({ role: 'model', parts })
                    }
                } else {
                    geminiMessages.push({
                        role: 'user',
                        parts: [{ text: msg.content }],
                    })
                }
            }

            const geminiTools = tools
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

            const responseStream = await (client.models.generateContentStream as any)({
                model: resolveGeminiModel(modelOptions?.model),
                contents: geminiMessages,
                config: {
                    systemInstruction: systemPrompt
                        ? { parts: [{ text: systemPrompt }] }
                        : undefined,
                    tools: geminiTools,
                    temperature: modelOptions?.temperature,
                    maxOutputTokens,
                    thinkingConfig,
                    abortSignal: signal,
                    httpOptions: {
                        signal,
                    },
                },
                abortSignal: signal,
            })

            let totalPromptTokens = 0
            let totalCompletionTokens = 0

            for await (const chunk of responseStream) {
                if (chunk.usageMetadata) {
                    totalPromptTokens = chunk.usageMetadata.promptTokenCount || totalPromptTokens
                    totalCompletionTokens =
                        chunk.usageMetadata.candidatesTokenCount || totalCompletionTokens
                }
                const candidate = chunk.candidates?.[0]
                if (candidate?.finishReason === 'MAX_TOKENS') {
                    console.warn('[gemini provider] candidate reached MAX_TOKENS output limit')
                }
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
                            inputDelta: JSON.stringify(fc.args),
                        }
                    }
                }
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

export class GeminiProvider implements LLMProvider {
    public id = 'gemini'
    private provider: LLMProvider

    constructor(apiKey?: string) {
        this.provider = geminiProvider(apiKey)
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
