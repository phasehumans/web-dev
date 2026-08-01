import { prisma } from '@december/database'
import Redis from 'ioredis'

import { E2BSandboxService } from './e2b-sandbox.service'

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
const redisSub = redisPub.duplicate()

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
    try {
        for await (const event of stream) {
            // publish to socket rooms
            await redisPub.publish(`session_events:${sessionId}`, event.data)

            // handle specific events like usage and credits
            const parsedEvent = JSON.parse(event.data)
            if (parsedEvent.type === 'AgentUsage') {
                await updateCredits(sessionId, parsedEvent)
            }
        }
    } catch (e: any) {
        // Stream ended or connection closed: log exception safely
        console.error(`Stream ended for ${sessionId}: ${e?.message || e}`)
    } finally {
        await prisma.session.update({
            where: { id: sessionId },
            data: { vmStatus: 'STOPPED' },
        })
    }
}

async function updateCredits(sessionId: string, event: any) {
    // token tracking logic
}
