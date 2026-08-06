import { describe, it, expect } from 'bun:test'

import {
    createRazorpayOrderSchema,
    verifyRazorpayPaymentSchema,
    creditsHistoryQuerySchema,
    redeemCodeSchema,
    addCreditsSchema,
} from '../../src/modules/billing/billing.schema'

describe('Billing Schema - Unit Tests', () => {
    describe('createRazorpayOrderSchema', () => {
        it('should pass with valid amount within range ($20.00 to $100.00 in cents)', () => {
            const validPayload = {
                amountInCents: 2000,
                currency: 'USD',
            }
            const result = createRazorpayOrderSchema.safeParse(validPayload)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.amountInCents).toBe(2000)
                expect(result.data.currency).toBe('USD')
            }
        })

        it('should default currency to USD if omitted', () => {
            const result = createRazorpayOrderSchema.safeParse({ amountInCents: 5000 })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.currency).toBe('USD')
            }
        })

        it('should fail if amount is below minimum ($20.00 / 2000 cents)', () => {
            const result = createRazorpayOrderSchema.safeParse({ amountInCents: 1500 })
            expect(result.success).toBe(false)
        })

        it('should fail if amount exceeds maximum ($100.00 / 10000 cents)', () => {
            const result = createRazorpayOrderSchema.safeParse({ amountInCents: 15000 })
            expect(result.success).toBe(false)
        })

        it('should fail if amount is not an integer', () => {
            const result = createRazorpayOrderSchema.safeParse({ amountInCents: 2500.5 })
            expect(result.success).toBe(false)
        })
    })

    describe('verifyRazorpayPaymentSchema', () => {
        it('should pass with all required Razorpay fields', () => {
            const validPayload = {
                razorpay_order_id: 'order_12345',
                razorpay_payment_id: 'pay_67890',
                razorpay_signature: 'sig_abcdef',
            }
            const result = verifyRazorpayPaymentSchema.safeParse(validPayload)
            expect(result.success).toBe(true)
        })

        it('should fail if any required field is missing or empty', () => {
            const invalidPayload = {
                razorpay_order_id: 'order_12345',
                razorpay_payment_id: '',
                razorpay_signature: 'sig_abcdef',
            }
            const result = verifyRazorpayPaymentSchema.safeParse(invalidPayload)
            expect(result.success).toBe(false)
        })
    })

    describe('creditsHistoryQuerySchema', () => {
        it('should pass and coerce string limits and offsets to numbers with defaults', () => {
            const result = creditsHistoryQuerySchema.safeParse({})
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.limit).toBe(25)
                expect(result.data.offset).toBe(0)
            }
        })

        it('should coerce query strings and validate bounds', () => {
            const result = creditsHistoryQuerySchema.safeParse({
                limit: '50',
                offset: '10',
                periodStart: '2026-01-01',
                periodEnd: '2026-01-31',
            })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.limit).toBe(50)
                expect(result.data.offset).toBe(10)
                expect(result.data.periodStart).toBe('2026-01-01')
            }
        })

        it('should fail if limit exceeds max (100)', () => {
            const result = creditsHistoryQuerySchema.safeParse({ limit: 150 })
            expect(result.success).toBe(false)
        })

        it('should fail if offset is negative', () => {
            const result = creditsHistoryQuerySchema.safeParse({ offset: -1 })
            expect(result.success).toBe(false)
        })
    })

    describe('redeemCodeSchema', () => {
        it('should pass with valid non-empty code', () => {
            const result = redeemCodeSchema.safeParse({ code: 'DECEMBER2026' })
            expect(result.success).toBe(true)
        })

        it('should fail with empty code', () => {
            const result = redeemCodeSchema.safeParse({ code: '   ' })
            expect(result.success).toBe(false)
        })
    })

    describe('addCreditsSchema', () => {
        it('should pass with valid amount and valid payment method', () => {
            const methods = ['card', 'upi', 'crypto'] as const
            for (const paymentMethod of methods) {
                const result = addCreditsSchema.safeParse({
                    amountInCents: 3000,
                    paymentMethod,
                })
                expect(result.success).toBe(true)
            }
        })

        it('should fail with unsupported payment method', () => {
            const result = addCreditsSchema.safeParse({
                amountInCents: 3000,
                paymentMethod: 'paypal',
            })
            expect(result.success).toBe(false)
        })
    })
})
