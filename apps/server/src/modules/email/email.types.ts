import type { JobsOptions } from 'bullmq'

export type OtpType = 'signup' | 'verification' | 'password_reset'

export type SendOtpEmailParams = {
    to: string
    otp: string
    type?: OtpType
}

export type SendWelcomeEmailParams = {
    to: string
    name: string
}

export type SendOtpJobData = {
    type: 'otp'
    to: string
    otp: string
    otpType?: OtpType
}

export type SendWelcomeJobData = {
    type: 'welcome'
    to: string
    name: string
}

export type EmailJobData = SendOtpJobData | SendWelcomeJobData

export type ProcessEmailJobResult = {
    success: boolean
    messageId?: string
    error?: string
}

export type EmailQueueOptions = JobsOptions
