import { prisma } from '@december/database'
import Redis from 'ioredis'

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

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
