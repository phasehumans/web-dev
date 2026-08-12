import { prisma } from '@december/database'
import Redis from 'ioredis'

import { E2BSandboxService } from './e2b-sandbox.service'

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
})
redisPub.on('error', (err) => {
    // Intentionally swallowed: Suppress offline Redis error noise in test environment
})
const redisSub = redisPub.duplicate({ enableReadyCheck: false })
redisSub.on('error', (err) => {
    // Intentionally swallowed: Suppress offline Redis sub error noise in test environment
})

redisSub.psubscribe('session_events:*', (err) => {
    if (err) {
        // Intentionally swallowed: Fallback during offline Redis test runs
    }
})

redisSub.on('pmessage', (pattern, channel, message) => {
    try {
        const parsed = JSON.parse(message)
        if (parsed.type === 'ClientDisconnect' && parsed.sessionId) {
            E2BSandboxService.handleDisconnect({
                sessionId: parsed.sessionId,
                gracePeriodMs: 120000,
            })
        }
    } catch {
        // Intentionally swallowed: message parse error fallback
    }
})

export async function processGrpcStream(sessionId: string, stream: any) {
    let hasError = false
    try {
        for await (const event of stream) {
            const parsedEvent = JSON.parse(event.data)
            console.log(
                `[WORKER LISTENER -> REDIS] Session '${sessionId}' -> Publishing event '${parsedEvent.type || 'unknown'}'`
            )

            // publish to socket rooms if redis is connected
            if (redisPub.status === 'ready') {
                await redisPub.publish(`session_events:${sessionId}`, event.data).catch(() => {})
            }

            // handle specific events like usage and credits
            if (parsedEvent.type === 'AgentUsage') {
                await updateCredits(sessionId, parsedEvent)
            } else if (parsedEvent.type === 'AgentError') {
                hasError = true
                console.error(
                    `[WORKER LISTENER] Session '${sessionId}' AgentError received:`,
                    parsedEvent.error || parsedEvent.message
                )
            }
        }
    } catch (e: any) {
        hasError = true
        // Stream ended or connection closed: log exception safely
        console.error(`[WORKER LISTENER] Stream ended for ${sessionId}: ${e?.message || e}`)
    } finally {
        console.log(
            `[WORKER LISTENER] Stream finished for session '${sessionId}'. Setting Prisma session status -> ${hasError ? 'FAILED' : 'STOPPED'}`
        )
        await prisma.session
            .update({
                where: { id: sessionId },
                data: { vmStatus: hasError ? 'FAILED' : 'STOPPED' },
            })
            .catch(() => {
                // Intentionally swallowed: DB fallback during stream cleanup
            })
    }
}

async function updateCredits(sessionId: string, event: any) {
    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { userId: true },
        })
        if (!session) return

        const promptTokens = Number(event.promptTokens) || 0
        const completionTokens = Number(event.completionTokens) || 0
        const totalTokens = promptTokens + completionTokens
        const model = event.model || 'gemini-3.6-flash'
        const now = new Date()

        console.log(
            `[WORKER LISTENER] Recording UsageEvent for session '${sessionId}': promptTokens=${promptTokens}, completionTokens=${completionTokens}, totalTokens=${totalTokens}`
        )

        await prisma.usageEvent.create({
            data: {
                userId: session.userId,
                sessionId,
                model,
                inputTokens: promptTokens,
                outputTokens: completionTokens,
                totalTokens,
                costInCents: Math.ceil(totalTokens * 0.0001),
                periodStart: now,
                periodEnd: now,
            },
        })
    } catch (err) {
        console.error(
            `[WORKER LISTENER] Failed to record token usage for session ${sessionId}:`,
            err
        )
    }
}
