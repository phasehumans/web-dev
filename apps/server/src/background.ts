import { prisma } from '@december/database'
import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'

import { authService } from './modules/auth/auth.service'
import { fetchLiveModelRates } from './modules/usage/usage.rates'
import { deletePrefix } from './shared/project-storage'

// Initialize live model rates catalog
fetchLiveModelRates().catch((err) => {
    // Intentionally swallowed: fallback to embedded official catalog if offline
    console.warn(
        '[Background] Live model rates initial fetch failed, using official catalog:',
        err?.message || err
    )
})

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
})
redisConnection.on('error', (err) => {
    console.error('[Background Redis Error]', err?.message || err)
})

// setup minio_wipe worker
const minioWipeWorker = new Worker(
    'minio_wipe',
    async (job) => {
        const { prefix } = job.data
        console.log(`[Background] Executing minio_wipe for prefix: ${prefix}`)
        await deletePrefix(prefix)
    },
    { connection: redisConnection as any }
)

minioWipeWorker.on('failed', (job, err) => {
    console.error(`[Background] Job ${job?.id} failed with error ${err.message}`)
})

// setup sweep_cron worker
const sweepQueue = new Queue('sweep_jobs', { connection: redisConnection as any })
// add repeatable job running daily
sweepQueue.add('daily_sweep', {}, { repeat: { pattern: '0 0 * * *' } })

const sweepWorker = new Worker(
    'sweep_jobs',
    async (job) => {
        if (job.name === 'daily_sweep') {
            console.log(`[Background] Running daily garbage collection sweep`)
            await authService.purgeExpiredAndRevokedSessions().catch((err) => {
                console.error('[Background] Failed to purge expired sessions:', err)
            })
            // cleanup sessions older than 30 days or orphaned db records
            await prisma.session.deleteMany({
                where: {
                    updatedAt: {
                        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            })
        }
    },
    { connection: redisConnection as any }
)

console.log('[Background] Background workers initialized.')
