import { Queue } from 'bullmq'
import Redis from 'ioredis'

import { env } from '../../env'

import type { EmailJobData, SendOtpEmailParams, SendWelcomeEmailParams } from './email.types'

let _emailQueue: Queue<EmailJobData> | null = null

export const getEmailQueue = (): Queue<EmailJobData> => {
    if (!_emailQueue) {
        const redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableOfflineQueue: false,
        })
        redisConnection.on('error', (_err) => {
            // Intentionally swallowed: handles redis connection errors gracefully when offline in test environment
        })

        _emailQueue = new Queue<EmailJobData>('email_jobs', {
            connection: redisConnection as any,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
                removeOnFail: 1000,
            },
        })
    }
    return _emailQueue
}

export const setEmailQueue = (queue: Queue<EmailJobData> | null) => {
    _emailQueue = queue
}

export const enqueueOtpJob = async (data: SendOtpEmailParams) => {
    const queue = getEmailQueue()
    return queue.add(
        'send_otp',
        {
            type: 'otp',
            to: data.to,
            otp: data.otp,
            otpType: data.type || 'verification',
        },
        {
            priority: 1,
        }
    )
}

export const enqueueWelcomeJob = async (data: SendWelcomeEmailParams) => {
    const queue = getEmailQueue()
    return queue.add(
        'send_welcome',
        {
            type: 'welcome',
            to: data.to,
            name: data.name,
        },
        {
            priority: 5,
        }
    )
}
