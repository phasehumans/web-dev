import { describe, it, expect, afterEach } from 'bun:test'

import resend from '../../src/config/email'
import { env } from '../../src/env'
import { processEmailJob, createEmailWorker } from '../../src/modules/email/email.worker'

describe('Email Worker - Unit Tests', () => {
    const originalSend = resend.emails.send
    const originalNodeEnv = env.NODE_ENV
    const originalResendKey = env.RESEND_API_KEY

    afterEach(() => {
        resend.emails.send = originalSend
        ;(env as any).NODE_ENV = originalNodeEnv
        ;(env as any).RESEND_API_KEY = originalResendKey
    })

    it('should process OTP job successfully and call resend.emails.send', async () => {
        let sentPayload: any = null
        resend.emails.send = (async (payload: any) => {
            sentPayload = payload
            return { data: { id: 'email-resend-123' }, error: null }
        }) as any

        const mockJob: any = {
            id: 'job-otp-1',
            data: {
                type: 'otp',
                to: 'recipient@example.com',
                otp: '889900',
                otpType: 'signup',
            },
        }

        const result = await processEmailJob(mockJob)

        expect(result.success).toBe(true)
        expect(result.messageId).toBe('email-resend-123')
        expect(sentPayload).not.toBeNull()
        expect(sentPayload.to).toBe('recipient@example.com')
        expect(sentPayload.subject).toBe('Your December verification code: 889900')
        expect(sentPayload.html).toContain('889900')
    })

    it('should process Welcome email job successfully and call resend.emails.send', async () => {
        let sentPayload: any = null
        resend.emails.send = (async (payload: any) => {
            sentPayload = payload
            return { data: { id: 'email-welcome-456' }, error: null }
        }) as any

        const mockJob: any = {
            id: 'job-welcome-1',
            data: {
                type: 'welcome',
                to: 'newuser@example.com',
                name: 'Alex',
            },
        }

        const result = await processEmailJob(mockJob)

        expect(result.success).toBe(true)
        expect(result.messageId).toBe('email-welcome-456')
        expect(sentPayload).not.toBeNull()
        expect(sentPayload.to).toBe('newuser@example.com')
        expect(sentPayload.subject).toBe('Welcome to December')
        expect(sentPayload.html).toContain('Hi Alex')
    })

    it('should throw error on failure in production so BullMQ can trigger retries', async () => {
        ;(env as any).NODE_ENV = 'production'
        ;(env as any).RESEND_API_KEY = 're_test_key'
        resend.emails.send = (async () => {
            throw new Error('Resend rate limit exceeded (429)')
        }) as any

        const mockJob: any = {
            id: 'job-otp-fail',
            data: {
                type: 'otp',
                to: 'fail@example.com',
                otp: '123456',
                otpType: 'verification',
            },
        }

        await expect(processEmailJob(mockJob)).rejects.toThrow('Resend rate limit exceeded')
    })

    it('should return dev-fallback when in development and Resend fails', async () => {
        ;(env as any).NODE_ENV = 'development'
        ;(env as any).RESEND_API_KEY = undefined
        resend.emails.send = (async () => {
            throw new Error('Resend API key missing in local development')
        }) as any

        const mockJob: any = {
            id: 'job-otp-dev',
            data: {
                type: 'otp',
                to: 'dev@example.com',
                otp: '999111',
                otpType: 'password_reset',
            },
        }

        const result = await processEmailJob(mockJob)
        expect(result.success).toBe(true)
        expect(result.messageId).toBe('dev-fallback')
    })

    it('should handle Resend API error response object in development by returning dev-fallback', async () => {
        ;(env as any).NODE_ENV = 'development'
        resend.emails.send = (async () => {
            return {
                data: null,
                error: {
                    statusCode: 403,
                    message: 'The trydecember.com domain is not verified.',
                    name: 'validation_error',
                },
            }
        }) as any

        const mockJob: any = {
            id: 'job-otp-unverified',
            data: {
                type: 'otp',
                to: 'user@example.com',
                otp: '654321',
                otpType: 'signup',
            },
        }

        const result = await processEmailJob(mockJob)
        expect(result.success).toBe(true)
        expect(result.messageId).toBe('dev-fallback')
    })

    it('should throw when Resend API returns error object in production', async () => {
        ;(env as any).NODE_ENV = 'production'
        ;(env as any).RESEND_API_KEY = 're_live_key'
        resend.emails.send = (async () => {
            return {
                data: null,
                error: {
                    statusCode: 403,
                    message: 'The trydecember.com domain is not verified.',
                    name: 'validation_error',
                },
            }
        }) as any

        const mockJob: any = {
            id: 'job-otp-prod-error',
            data: {
                type: 'otp',
                to: 'user@example.com',
                otp: '654321',
                otpType: 'signup',
            },
        }

        await expect(processEmailJob(mockJob)).rejects.toThrow(
            'The trydecember.com domain is not verified'
        )
    })

    it('should throw for unknown email job type', async () => {
        const mockJob: any = {
            id: 'job-unknown',
            data: {
                type: 'unknown_type',
            },
        }

        await expect(processEmailJob(mockJob)).rejects.toThrow('Unknown email job type')
    })

    it('should create email worker without throwing', () => {
        const worker = createEmailWorker()
        expect(worker).toBeDefined()
        expect(worker.name).toBe('email_jobs')
    })
})
