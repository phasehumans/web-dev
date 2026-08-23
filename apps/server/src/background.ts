import { prisma } from '@december/database'
import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'

import { env } from './env'
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

const redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
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
// add repeatable jobs
sweepQueue.add('daily_sweep', {}, { repeat: { pattern: '0 0 * * *' } })
sweepQueue.add('refresh_model_rates', {}, { repeat: { pattern: '0 */6 * * *' } })

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
        } else if (job.name === 'refresh_model_rates') {
            console.log(`[Background] Refreshing live OpenRouter model rates catalog`)
            await fetchLiveModelRates(true).catch((err) => {
                // Intentionally swallowed: fallback to embedded official catalog if offline
                console.warn(
                    '[Background] Failed to refresh live model rates:',
                    err?.message || err
                )
            })
        }
    },
    { connection: redisConnection as any }
)

console.log('[Background] Background workers initialized.')
