import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@december/database'

import { s3 } from '../../config/s3'
import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { usageService } from '../usage/usage.service'

import { cliRepository } from './cli.repository'

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
    const activeSession = await prisma.session.findFirst({
        where: {
            userId,
            vmStatus: { in: ['RUNNING', 'PROVISIONING'] },
        },
    })

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

const OPENROUTER_MODEL_MAP: Record<string, string> = {
    'gemini-3.7-flash': 'google/gemini-3.7-flash',
    'gemini-3.6-flash': 'google/gemini-3.6-flash',
    'gemini-3.5-flash': 'google/gemini-3.5-flash',
    'gemini-3.5-flash-lite': 'google/gemini-3.5-flash-lite',
    'gemini-3-pro-preview': 'google/gemini-3-pro-preview',
    'gemini-3.1-pro': 'google/gemini-3-pro-preview',
    'claude-3-7-sonnet-latest': 'anthropic/claude-3.7-sonnet',
    'claude-3-5-sonnet-latest': 'anthropic/claude-3.5-sonnet',
    'claude-3-5-haiku-latest': 'anthropic/claude-3.5-haiku',
    'claude-3-opus-latest': 'anthropic/claude-3-opus',
    'o3-mini': 'openai/o3-mini',
    o1: 'openai/o1',
    'o1-mini': 'openai/o1-mini',
    'gpt-4o': 'openai/gpt-4o',
    'gpt-4o-mini': 'openai/gpt-4o-mini',
    'gpt-4.5-preview': 'openai/gpt-4.5-preview',
    'deepseek-reasoner': 'deepseek/deepseek-r1',
    'deepseek-chat': 'deepseek/deepseek-chat',
}

const proxyChatCompletions = async (data: ProxyChatCompletions) => {
    const { userId, body, res } = data
    body.stream = true
    if (!body.stream_options) {
        body.stream_options = { include_usage: true }
    } else {
        body.stream_options.include_usage = true
    }

    if (body.model && OPENROUTER_MODEL_MAP[body.model]) {
        body.model = OPENROUTER_MODEL_MAP[body.model]
    }

    const openRouterKey = env.OPENROUTER_API_KEY
    if (!openRouterKey) {
        throw new AppError('OpenRouter API Key not configured', 500)
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': env.WEB_URL,
            'X-Title': 'December Proxy',
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('[OpenRouter Error]:', errorText)
        throw new AppError(`Upstream error: ${response.statusText}`, response.status)
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = response.body?.getReader()
    if (!reader) {
        throw new AppError('No body in upstream response', 500)
    }

    const decoder = new TextDecoder()
    let usage: any = null
    const model = body.model
    let lineBuffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            res.write(chunk)

            lineBuffer += chunk
            const lines = lineBuffer.split('\n')
            lineBuffer = lines.pop() ?? ''

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const parsed = JSON.parse(line.substring(6))
                        if (parsed.usage) {
                            usage = parsed.usage
                        }
                    } catch {
                        // Intentionally swallowed: ignore non-JSON SSE chunk fragments
                    }
                }
            }
        }

        if (lineBuffer.startsWith('data: ') && lineBuffer !== 'data: [DONE]') {
            try {
                const parsed = JSON.parse(lineBuffer.substring(6))
                if (parsed.usage) {
                    usage = parsed.usage
                }
            } catch {
                // Intentionally swallowed: ignore non-JSON SSE chunk fragments
            }
        }
    } catch (streamErr) {
        console.error('[Proxy Stream Error]:', streamErr)
    } finally {
        if (!res.writableEnded) {
            res.end()
        }

        if (usage) {
            usageService
                .recordUsageEvent({
                    userId,
                    model,
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
