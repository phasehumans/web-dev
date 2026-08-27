import { Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

import resend from '../../config/email'
import { env } from '../../env'
import { renderOtpEmail } from '../auth/templates/otp.template'
import { renderWelcomeEmail } from '../auth/templates/welcome.template'

import type { EmailJobData, ProcessEmailJobResult } from './email.types'

export const processEmailJob = async (job: Job<EmailJobData>): Promise<ProcessEmailJobResult> => {
    const data = job.data
    const fromEmail = env.SENDER_EMAIL || 'onboarding@resend.dev'
    const webUrl = env.WEB_URL || 'https://trydecember.com'

    if (data.type === 'otp') {
        const { to, otp, otpType = 'verification' } = data
        const { subject, html, text } = renderOtpEmail({
            otp,
            type: otpType,
            supportEmail: fromEmail,
            webUrl,
        })

        try {
            const result = await resend.emails.send({
                from: `December <${fromEmail}>`,
                to,
                subject,
                html,
                text,
            })
            return { success: true, messageId: result.data?.id }
        } catch (error: any) {
            console.error(`[Email Worker] Failed to send OTP email to ${to}:`, error)
            if (env.NODE_ENV === 'development' || !env.RESEND_API_KEY) {
                console.log(`[DEV OTP Code] Verification code for ${to} is: ${otp}`)
                return { success: true, messageId: 'dev-fallback' }
            }
            throw error
        }
    }

    if (data.type === 'welcome') {
        const { to, name } = data
        const { subject, html, text } = renderWelcomeEmail({
            name,
            supportEmail: fromEmail,
            webUrl,
        })

        try {
            const result = await resend.emails.send({
                from: `December <${fromEmail}>`,
                to,
                subject,
                html,
                text,
            })
            return { success: true, messageId: result.data?.id }
        } catch (error: any) {
            console.error(`[Email Worker] Failed to send Welcome email to ${to}:`, error)
            if (env.NODE_ENV === 'development' || !env.RESEND_API_KEY) {
                return { success: true, messageId: 'dev-fallback' }
            }
            throw error
        }
    }

    throw new Error(`Unknown email job type: ${(data as any)?.type}`)
}

export const createEmailWorker = (connection?: Redis): Worker<EmailJobData> => {
    const redisConnection =
        connection ||
        new Redis(env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            lazyConnect: true,
            enableOfflineQueue: false,
        })

    redisConnection.on('error', (_err) => {
        // Intentionally swallowed: handles redis connection errors gracefully in test/offline environment
    })

    const worker = new Worker<EmailJobData>(
        'email_jobs',
        async (job) => {
            return processEmailJob(job)
        },
        {
            connection: redisConnection as any,
            concurrency: 5,
        }
    )

    worker.on('error', (_err) => {
        // Intentionally swallowed: handles redis worker connection errors gracefully in test/offline environment
    })

    worker.on('failed', (job, err) => {
        console.error(
            `[Email Worker] Job ${job?.id} (type: ${job?.data?.type}) failed:`,
            err.message
        )
    })

    return worker
}
