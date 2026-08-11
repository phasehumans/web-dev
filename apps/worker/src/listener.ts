import { prisma } from '@december/database'
import Redis from 'ioredis'

import { E2BSandboxService } from './e2b-sandbox.service'

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
redisPub.on('error', (err) => {
    console.error('[Worker Listener RedisPub Error]', err?.message || err)
})
const redisSub = redisPub.duplicate({ enableReadyCheck: false })
redisSub.on('error', (err) => {
    console.error('[Worker Listener RedisSub Error]', err?.message || err)
})

redisSub.psubscribe('session_events:*', (err) => {
    if (err) console.error('[Worker Listener] Failed to subscribe to session_events:', err)
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
            // publish to socket rooms
            await redisPub.publish(`session_events:${sessionId}`, event.data)

            // handle specific events like usage and credits
            const parsedEvent = JSON.parse(event.data)
            if (parsedEvent.type === 'AgentUsage') {
                await updateCredits(sessionId, parsedEvent)
            } else if (parsedEvent.type === 'AgentError') {
                hasError = true
            }
        }
    } catch (e: any) {
        hasError = true
        // Stream ended or connection closed: log exception safely
        console.error(`Stream ended for ${sessionId}: ${e?.message || e}`)
    } finally {
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
            `[Worker Listener] Failed to record token usage for session ${sessionId}:`,
            err
        )
    }
}
