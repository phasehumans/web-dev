import { describe, it, expect, mock, beforeEach } from 'bun:test'

import {
    getEmailQueue,
    setEmailQueue,
    enqueueOtpJob,
    enqueueWelcomeJob,
} from '../../src/modules/email/email.queue'

describe('Email Queue - Unit Tests', () => {
    let mockQueue: any

    beforeEach(() => {
        mockQueue = {
            add: mock(async (name: string, data: any, opts: any) => ({
                id: 'mock-job-id',
                name,
                data,
                opts,
            })),
        }
        setEmailQueue(mockQueue)
    })

    it('should initialize and return the BullMQ queue instance', () => {
        setEmailQueue(null)
        const queue = getEmailQueue()
        expect(queue).toBeDefined()
        expect(queue.name).toBe('email_jobs')
    })

    it('should enqueue OTP email job with priority 1 and correct payload', async () => {
        const result: any = await enqueueOtpJob({
            to: 'alex@example.com',
            otp: '123456',
            type: 'signup',
        })

        expect(mockQueue.add).toHaveBeenCalledTimes(1)
        expect(result.name).toBe('send_otp')
        expect(result.data).toEqual({
            type: 'otp',
            to: 'alex@example.com',
            otp: '123456',
            otpType: 'signup',
        })
        expect(result.opts).toEqual({
            priority: 1,
        })
    })

    it('should default otpType to verification if omitted', async () => {
        const result: any = await enqueueOtpJob({
            to: 'user@example.com',
            otp: '654321',
        })

        expect(result.data.otpType).toBe('verification')
        expect(result.opts.priority).toBe(1)
    })

    it('should enqueue welcome email job with priority 5 and correct payload', async () => {
        const result: any = await enqueueWelcomeJob({
            to: 'welcome@example.com',
            name: 'Alex Developer',
        })

        expect(mockQueue.add).toHaveBeenCalledTimes(1)
        expect(result.name).toBe('send_welcome')
        expect(result.data).toEqual({
            type: 'welcome',
            to: 'welcome@example.com',
            name: 'Alex Developer',
        })
        expect(result.opts).toEqual({
            priority: 5,
        })
    })
})
