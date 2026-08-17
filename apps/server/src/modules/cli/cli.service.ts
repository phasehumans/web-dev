import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { s3 } from '../../config/s3'
import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { usageService } from '../usage/usage.service'

import { cliDispatcher } from './cli.dispatcher'
import { cliRepository } from './cli.repository'
import { parseOpenAiChatRequest } from './cli.utils'

import type {
    VerifyWalletBalance,
    GenerateHandoffUrl,
    ProxyChatCompletions,
    CompleteHandoff,
} from './cli.types'

const verifyWalletBalance = async (data: VerifyWalletBalance) => {
    const { userId } = data
    return usageService.hasMinimumBalance({ userId })
}

const generateHandoffUrl = async (data: GenerateHandoffUrl) => {
    const { userId } = data
    const activeSession = await cliRepository.findActiveSessionByUser(userId)

    if (activeSession) {
        throw new AppError(
            'Conflict: You already have an active cloud session running. Please stop it before handing off.',
            409
        )
    }

    const objectKey = `handoffs/${userId}/${Date.now()}-handoff.tar.gz`

    const putCommand = new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: objectKey,
    })

    const uploadUrl = await getSignedUrl(s3 as any, putCommand as any, { expiresIn: 3600 })

    return {
        uploadUrl,
        objectKey,
    }
}

const proxyChatCompletions = async (data: ProxyChatCompletions) => {
    const { userId, body, res } = data
    const requestedModel = body.model || 'auto'

    const { provider, model } = cliDispatcher.resolveServerProvider(requestedModel)
    const { systemPrompt, messages, tools, modelOptions } = parseOpenAiChatRequest(body)
    modelOptions.model = model

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const responseId = `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const timestamp = Math.floor(Date.now() / 1000)
    const toolCallIndexMap = new Map<string, number>()
    let hasToolCalls = false
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null =
        null

    const getToolCallIndex = (id: string): number => {
        if (!toolCallIndexMap.has(id)) {
            toolCallIndexMap.set(id, toolCallIndexMap.size)
        }
        return toolCallIndexMap.get(id)!
    }

    try {
        const stream = provider.stream(messages, tools, systemPrompt, modelOptions)

        for await (const chunk of stream) {
            if (chunk.type === 'text') {
                const sse = {
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: requestedModel,
                    choices: [
                        {
                            index: 0,
                            delta: { content: chunk.text },
                            finish_reason: null,
                        },
                    ],
                }
                res.write(`data: ${JSON.stringify(sse)}\n\n`)
            } else if (chunk.type === 'thinking_delta') {
                const sse = {
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: requestedModel,
                    choices: [
                        {
                            index: 0,
                            delta: { reasoning_content: chunk.text },
                            finish_reason: null,
                        },
                    ],
                }
                res.write(`data: ${JSON.stringify(sse)}\n\n`)
            } else if (chunk.type === 'tool_call_delta') {
                hasToolCalls = true
                const toolIndex = getToolCallIndex(chunk.id)
                const sse = {
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: requestedModel,
                    choices: [
                        {
                            index: 0,
                            delta: {
                                tool_calls: [
                                    {
                                        index: toolIndex,
                                        id: chunk.id,
                                        type: 'function',
                                        function: {
                                            ...(chunk.name ? { name: chunk.name } : {}),
                                            arguments: chunk.inputDelta,
                                        },
                                    },
                                ],
                            },
                            finish_reason: null,
                        },
                    ],
                }
                res.write(`data: ${JSON.stringify(sse)}\n\n`)
            } else if (chunk.type === 'tool_call') {
                hasToolCalls = true
                const tc = chunk.toolCall
                const toolIndex = getToolCallIndex(tc.id)
                const sse = {
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: requestedModel,
                    choices: [
                        {
                            index: 0,
                            delta: {
                                tool_calls: [
                                    {
                                        index: toolIndex,
                                        id: tc.id,
                                        type: 'function',
                                        function: {
                                            name: tc.name,
                                            arguments: tc.input,
                                        },
                                    },
                                ],
                            },
                            finish_reason: null,
                        },
                    ],
                }
                res.write(`data: ${JSON.stringify(sse)}\n\n`)
            } else if (chunk.type === 'usage') {
                usage = {
                    prompt_tokens: chunk.promptTokens,
                    completion_tokens: chunk.completionTokens,
                    total_tokens: chunk.promptTokens + chunk.completionTokens,
                }
            }
        }

        const finishChunk = {
            id: responseId,
            object: 'chat.completion.chunk',
            created: timestamp,
            model: requestedModel,
            choices: [
                {
                    index: 0,
                    delta: {},
                    finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
                },
            ],
            usage: usage || undefined,
        }
        res.write(`data: ${JSON.stringify(finishChunk)}\n\n`)
        res.write('data: [DONE]\n\n')
    } catch (streamErr: any) {
        console.error('[Proxy Stream Error]:', streamErr)
        if (!res.headersSent) {
            throw new AppError(streamErr?.message || 'Error communicating with model provider', 500)
        } else {
            const errorSse = {
                error: {
                    message: streamErr?.message || 'Error communicating with model provider',
                    type: 'server_error',
                    code: '500',
                },
            }
            res.write(`data: ${JSON.stringify(errorSse)}\n\n`)
        }
    } finally {
        if (!res.writableEnded) {
            res.end()
        }

        if (usage) {
            usageService
                .recordUsageEvent({
                    userId,
                    model: requestedModel,
                    inputTokens: usage.prompt_tokens || 0,
                    outputTokens: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0,
                    externalRequestId: `proxy-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                })
                .catch((e) => console.error('[Proxy Usage Record Error]:', e))
        }
    }
}

const completeHandoff = async (data: CompleteHandoff) => {
    const { userId, title, messages, objectKey } = data
    const session = await cliRepository.createSession({
        userId,
        title: title || 'Handoff Session',
        messages: messages || [],
        minioPrefix: objectKey,
    })

    return session
}

export const cliService = {
    verifyWalletBalance,
    generateHandoffUrl,
    proxyChatCompletions,
    completeHandoff,
}
