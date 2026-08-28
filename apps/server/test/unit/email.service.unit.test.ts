import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'

import { setEmailQueue } from '../../src/modules/email/email.queue'
import { emailService } from '../../src/modules/email/email.service'

describe('Email Service - Unit Tests', () => {
    let mockQueue: any

    beforeEach(() => {
        mockQueue = {
            add: mock(async (name: string, data: any, opts: any) => ({
                id: `job-${name}-123`,
                name,
                data,
                opts,
            })),
        }
        setEmailQueue(mockQueue)
    })

    afterEach(() => {
        setEmailQueue(null)
    })

    it('should enqueue OTP email through email service', async () => {
        const result: any = await emailService.sendOtpEmail({
            to: 'test@example.com',
            otp: '445566',
            type: 'signup',
        })

        expect(mockQueue.add).toHaveBeenCalledTimes(1)
        expect(result).toBeDefined()
        expect(result.id).toBe('job-send_otp-123')
        expect(result.data.otp).toBe('445566')
    })

    it('should enqueue Welcome email through email service', async () => {
        const result: any = await emailService.sendWelcomeEmail({
            to: 'welcome@example.com',
            name: 'Jordan',
        })

        expect(mockQueue.add).toHaveBeenCalledTimes(1)
        expect(result).toBeDefined()
        expect(result.id).toBe('job-send_welcome-123')
        expect(result.data.name).toBe('Jordan')
    })

    it('should handle enqueue failure gracefully and return null', async () => {
        mockQueue.add = mock(async () => {
            throw new Error('Redis connection refused')
        })

        const result = await emailService.sendOtpEmail({
            to: 'test@example.com',
            otp: '123456',
        })

        expect(result).toBeNull()
    })
})
