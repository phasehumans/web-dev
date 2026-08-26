import crypto from 'crypto'

import { describe, it, expect, afterEach } from 'bun:test'

import {
    getRazorpayKeyId,
    getRazorpayKeySecret,
    getRazorpayWebhookSecret,
    verifyRazorpayOrderPayment,
    verifyRazorpayWebhookSignature,
} from '../../src/modules/billing/billing.utils'

describe('Billing Utils - Unit Tests', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
        process.env = { ...originalEnv }
    })

    describe('getRazorpayKeyId', () => {
        it('should return RAZORPAY_KEY_ID when environment variable is configured', () => {
            process.env.RAZORPAY_KEY_ID = 'rzp_test_key_id_123'
            expect(getRazorpayKeyId()).toBe('rzp_test_key_id_123')
        })

        it('should throw an error when RAZORPAY_KEY_ID is missing', () => {
            delete process.env.RAZORPAY_KEY_ID
            expect(() => getRazorpayKeyId()).toThrow('RAZORPAY_KEY_ID is not configured')
        })
    })

    describe('getRazorpayKeySecret', () => {
        it('should return RAZORPAY_KEY_SECRET when environment variable is configured', () => {
            process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret_456'
            expect(getRazorpayKeySecret()).toBe('rzp_test_secret_456')
        })

        it('should throw an error when RAZORPAY_KEY_SECRET is missing', () => {
            delete process.env.RAZORPAY_KEY_SECRET
            expect(() => getRazorpayKeySecret()).toThrow('RAZORPAY_KEY_SECRET is not configured')
        })
    })

    describe('getRazorpayWebhookSecret', () => {
        it('should return RAZORPAY_WEBHOOK_SECRET when environment variable is configured', () => {
            process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test_789'
            expect(getRazorpayWebhookSecret()).toBe('whsec_test_789')
        })

        it('should throw an error when RAZORPAY_WEBHOOK_SECRET is missing', () => {
            delete process.env.RAZORPAY_WEBHOOK_SECRET
            expect(() => getRazorpayWebhookSecret()).toThrow(
                'RAZORPAY_WEBHOOK_SECRET is not configured'
            )
        })
    })

    describe('verifyRazorpayOrderPayment', () => {
        it('should return true for valid HMAC SHA-256 signature match', () => {
            const secret = 'test_razorpay_secret_key'
            process.env.RAZORPAY_KEY_SECRET = secret

            const orderId = 'order_998877'
            const paymentId = 'pay_112233'
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')

            const isValid = verifyRazorpayOrderPayment({
                orderId,
                paymentId,
                signature: expectedSignature,
            })

            expect(isValid).toBe(true)
        })

        it('should return false for mismatched or tampered signature', () => {
            process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_key'

            const isValid = verifyRazorpayOrderPayment({
                orderId: 'order_998877',
                paymentId: 'pay_112233',
                signature: 'invalid_tampered_signature',
            })

            expect(isValid).toBe(false)
        })

        it('should return false if signature length differs', () => {
            process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_key'

            const isValid = verifyRazorpayOrderPayment({
                orderId: 'order_998877',
                paymentId: 'pay_112233',
                signature: 'short',
            })

            expect(isValid).toBe(false)
        })
    })

    describe('verifyRazorpayWebhookSignature', () => {
        it('should return true for valid webhook signature', () => {
            const secret = 'test_webhook_secret_key'
            const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' })
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(rawBody)
                .digest('hex')

            const isValid = verifyRazorpayWebhookSignature({
                rawBody,
                signature: expectedSignature,
                webhookSecret: secret,
            })

            expect(isValid).toBe(true)
        })

        it('should return false for invalid webhook signature', () => {
            const secret = 'test_webhook_secret_key'
            const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' })

            const isValid = verifyRazorpayWebhookSignature({
                rawBody,
                signature: 'invalid_sig',
                webhookSecret: secret,
            })

            expect(isValid).toBe(false)
        })
    })
})
