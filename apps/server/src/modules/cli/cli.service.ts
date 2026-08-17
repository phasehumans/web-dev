import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { prisma } from '@december/database'

import { s3 } from '../../config/s3'
import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { usageService } from '../usage/usage.service'

import { resolveUpstreamDispatch } from './cli.dispatcher'
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

const proxyChatCompletions = async (data: ProxyChatCompletions) => {
    const { userId, body, res } = data
    const requestedModel = body.model || 'auto'

    const dispatch = resolveUpstreamDispatch(body)

    const response = await fetch(dispatch.url, {
        method: 'POST',
        headers: dispatch.headers,
        body: JSON.stringify(dispatch.body),
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${dispatch.providerName.toUpperCase()} Proxy Error]:`, errorText)
        throw new AppError(
            `Upstream error (${dispatch.providerName}): ${response.statusText || errorText}`,
            response.status
        )
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
