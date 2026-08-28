import { env } from '../../env'

import { enqueueOtpJob, enqueueWelcomeJob } from './email.queue'

import type { SendOtpEmailParams, SendWelcomeEmailParams } from './email.types'

const sendOtpEmail = async (data: SendOtpEmailParams) => {
    const { to, otp, type = 'verification' } = data
    if (env.NODE_ENV === 'development') {
        console.log(
            `\n======================================================\n[DEV OTP Code] Verification code for ${to} is: ${otp}\n======================================================\n`
        )
    }
    try {
        return await enqueueOtpJob({ to, otp, type })
    } catch (error: any) {
        // Intentionally swallowed: fallback logging if Redis is offline during test or local development
        console.warn(
            `[Email Service] Failed to enqueue OTP email to ${to}:`,
            error?.message || error
        )
        return null
    }
}

const sendWelcomeEmail = async (data: SendWelcomeEmailParams) => {
    const { to, name } = data
    try {
        return await enqueueWelcomeJob({ to, name })
    } catch (error: any) {
        // Intentionally swallowed: fallback logging if Redis is offline during test or local development
        console.warn(
            `[Email Service] Failed to enqueue Welcome email to ${to}:`,
            error?.message || error
        )
        return null
    }
}

export const emailService = {
    sendOtpEmail,
    sendWelcomeEmail,
}
