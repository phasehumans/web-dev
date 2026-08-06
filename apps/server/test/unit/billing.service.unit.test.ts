import crypto from 'crypto'

import { describe, it, expect } from 'bun:test'

import { razorpay } from '../../src/config/razorpay'
import { billingRepository } from '../../src/modules/billing/billing.repository'
import { billingService } from '../../src/modules/billing/billing.service'
import { notificationService } from '../../src/modules/notification/notification.service'
import { AppError } from '../../src/shared/appError'

describe('Billing Service - Unit Tests', () => {
    describe('getOverview', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFindUser = billingRepository.findUserForOverview
            billingRepository.findUserForOverview = (async () => null) as any

            try {
                await expect(
                    billingService.getOverview({ userId: 'user-not-exist' })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                billingRepository.findUserForOverview = originalFindUser
            }
        })

        it('should aggregate credit balance, gifted credits, usage, and transactions', async () => {
            const originalFindUser = billingRepository.findUserForOverview
            const originalAggregate = billingRepository.aggregateUsage

            const mockCreatedAt = new Date('2026-01-01T00:00:00.000Z')
            billingRepository.findUserForOverview = (async () => ({
                id: 'user-1',
                creditBalance: 5000,
                createdAt: mockCreatedAt,
                redeemClaims: [
                    {
                        id: 'claim-1',
                        redeemedAt: new Date(),
                        redeemCode: { creditAmount: 1000, metadata: { code: 'WELCOME10' } },
                    },
                ],
                walletTransactions: [
                    {
                        id: 'tx-1',
                        createdAt: new Date(),
                        amountInCents: 2000,
                        currency: 'USD',
                        provider: 'RAZORPAY',
                        status: 'SUCCESS',
                    },
                ],
            })) as any

            billingRepository.aggregateUsage = (async () => ({
                _sum: {
                    inputTokens: 100,
                    outputTokens: 200,
                    totalTokens: 300,
                    costInCents: 150,
                },
            })) as any

            try {
                const res = await billingService.getOverview({ userId: 'user-1' })
                expect(res.creditBalance).toBe(5000)
                expect(res.giftedCredits).toBe(1000)
                expect(res.usage.totalTokens).toBe(300)
                expect(res.usage.costInCents).toBe(150)
                expect(res.claims.length).toBe(1)
                expect(res.transactions.length).toBe(1)
            } finally {
                billingRepository.findUserForOverview = originalFindUser
                billingRepository.aggregateUsage = originalAggregate
            }
        })
    })

    describe('createRazorpayOrder', () => {
        it('should create Razorpay order in INR paise and record wallet transaction', async () => {
            process.env.RAZORPAY_KEY_ID = 'rzp_test_key_123'
            const originalOrdersCreate = razorpay.orders.create
            const originalCreateTx = billingRepository.createWalletTransaction

            let createdOrderPayload: any = null
            let createdTxPayload: any = null

            razorpay.orders.create = (async (data: any) => {
                createdOrderPayload = data
                return {
                    id: 'order_rzp_12345',
                    amount: data.amount,
                    currency: 'INR',
                }
            }) as any

            billingRepository.createWalletTransaction = (async (data: any) => {
                createdTxPayload = data
                return { id: 'tx-new', ...data }
            }) as any

            try {
                const res = await billingService.createRazorpayOrder({
                    userId: 'user-1',
                    amountInCents: 2000, // $20 USD
                })

                // $20 * 84 INR = 1680 INR = 168000 Paise
                expect(createdOrderPayload.amount).toBe(168000)
                expect(createdOrderPayload.currency).toBe('INR')
                expect(createdTxPayload.amountInCents).toBe(2000)
                expect(createdTxPayload.providerOrderId).toBe('order_rzp_12345')

                expect(res.keyId).toBe('rzp_test_key_123')
                expect(res.orderId).toBe('order_rzp_12345')
                expect(res.amount).toBe(168000)
            } finally {
                razorpay.orders.create = originalOrdersCreate
                billingRepository.createWalletTransaction = originalCreateTx
            }
        })
    })

    describe('verifyRazorpayPayment', () => {
        it('should throw AppError 400 if HMAC signature is invalid', async () => {
            process.env.RAZORPAY_KEY_SECRET = 'secret_123'

            await expect(
                billingService.verifyRazorpayPayment({
                    userId: 'user-1',
                    razorpay_order_id: 'order_1',
                    razorpay_payment_id: 'pay_1',
                    razorpay_signature: 'invalid_sig',
                })
            ).rejects.toThrow(new AppError('invalid razorpay signature', 400))
        })

        it('should throw AppError 404 if transaction order is missing in DB', async () => {
            const secret = 'secret_123'
            process.env.RAZORPAY_KEY_SECRET = secret

            const orderId = 'order_1'
            const paymentId = 'pay_1'
            const signature = crypto
                .createHmac('sha256', secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')

            const originalFindTx = billingRepository.findWalletTransactionByOrderId
            billingRepository.findWalletTransactionByOrderId = (async () => null) as any

            try {
                await expect(
                    billingService.verifyRazorpayPayment({
                        userId: 'user-1',
                        razorpay_order_id: orderId,
                        razorpay_payment_id: paymentId,
                        razorpay_signature: signature,
                    })
                ).rejects.toThrow(new AppError('transaction order not found', 404))
            } finally {
                billingRepository.findWalletTransactionByOrderId = originalFindTx
            }
        })

        it('should throw AppError 403 if transaction belongs to a different user', async () => {
            const secret = 'secret_123'
            process.env.RAZORPAY_KEY_SECRET = secret

            const orderId = 'order_1'
            const paymentId = 'pay_1'
            const signature = crypto
                .createHmac('sha256', secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')

            const originalFindTx = billingRepository.findWalletTransactionByOrderId
            billingRepository.findWalletTransactionByOrderId = (async () => ({
                id: 'tx-1',
                userId: 'user-2', // Different user!
                status: 'PENDING',
                amountInCents: 2000,
            })) as any

            try {
                await expect(
                    billingService.verifyRazorpayPayment({
                        userId: 'user-1',
                        razorpay_order_id: orderId,
                        razorpay_payment_id: paymentId,
                        razorpay_signature: signature,
                    })
                ).rejects.toThrow(new AppError('unauthorized to verify this transaction', 403))
            } finally {
                billingRepository.findWalletTransactionByOrderId = originalFindTx
            }
        })

        it('should return alreadyProcessed: true if transaction status is already SUCCESS', async () => {
            const secret = 'secret_123'
            process.env.RAZORPAY_KEY_SECRET = secret

            const orderId = 'order_1'
            const paymentId = 'pay_1'
            const signature = crypto
                .createHmac('sha256', secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')

            const originalFindTx = billingRepository.findWalletTransactionByOrderId
            billingRepository.findWalletTransactionByOrderId = (async () => ({
                id: 'tx-1',
                userId: 'user-1',
                status: 'SUCCESS',
                amountInCents: 2000,
            })) as any

            try {
                const res = await billingService.verifyRazorpayPayment({
                    userId: 'user-1',
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                })

                expect(res.success).toBe(true)
                expect(res.alreadyProcessed).toBe(true)
            } finally {
                billingRepository.findWalletTransactionByOrderId = originalFindTx
            }
        })

        it('should update wallet transaction, add user credit balance, and send notification', async () => {
            const secret = 'secret_123'
            process.env.RAZORPAY_KEY_SECRET = secret

            const orderId = 'order_1'
            const paymentId = 'pay_1'
            const signature = crypto
                .createHmac('sha256', secret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex')

            const originalFindTx = billingRepository.findWalletTransactionByOrderId
            const originalVerifyUpdate = billingRepository.verifyAndUpdateWalletTransaction
            const originalSendNotif = notificationService.sendNotificationToUser

            billingRepository.findWalletTransactionByOrderId = (async () => ({
                id: 'tx-1',
                userId: 'user-1',
                status: 'PENDING',
                amountInCents: 2000,
            })) as any

            billingRepository.verifyAndUpdateWalletTransaction = (async () => ({
                id: 'user-1',
                creditBalance: 7000,
            })) as any

            let notificationSent = false
            notificationService.sendNotificationToUser = (async (data: any) => {
                notificationSent = true
                return { id: 'notif-1', ...data }
            }) as any

            try {
                const res = await billingService.verifyRazorpayPayment({
                    userId: 'user-1',
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: signature,
                })

                expect(res.success).toBe(true)
                expect(res.newBalance).toBe(7000)
                expect(notificationSent).toBe(true)
            } finally {
                billingRepository.findWalletTransactionByOrderId = originalFindTx
                billingRepository.verifyAndUpdateWalletTransaction = originalVerifyUpdate
                notificationService.sendNotificationToUser = originalSendNotif
            }
        })
    })

    describe('getCreditsHistory', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFindUser = billingRepository.findUserById
            billingRepository.findUserById = (async () => null) as any

            try {
                await expect(
                    billingService.getCreditsHistory({ userId: 'user-999', limit: 25, offset: 0 })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                billingRepository.findUserById = originalFindUser
            }
        })

        it('should query usage events and aggregate into periods', async () => {
            const originalFindUser = billingRepository.findUserById
            const originalFindEvents = billingRepository.findManyUsageEvents
            const originalCountEvents = billingRepository.countUsageEvents

            billingRepository.findUserById = (async () => ({ id: 'user-1' })) as any
            const pStart = new Date('2026-01-01T00:00:00.000Z')
            const pEnd = new Date('2026-01-02T00:00:00.000Z')

            billingRepository.findManyUsageEvents = (async () => [
                { id: 'ev-1', periodStart: pStart, periodEnd: pEnd, costInCents: 50 },
                { id: 'ev-2', periodStart: pStart, periodEnd: pEnd, costInCents: 30 },
            ]) as any

            billingRepository.countUsageEvents = (async () => 2) as any

            try {
                const res = await billingService.getCreditsHistory({
                    userId: 'user-1',
                    limit: 25,
                    offset: 0,
                })

                expect(res.events.length).toBe(2)
                expect(res.total).toBe(2)
                expect(res.periods.length).toBe(1)
                expect(res.periods[0]?.costInCents).toBe(80)
            } finally {
                billingRepository.findUserById = originalFindUser
                billingRepository.findManyUsageEvents = originalFindEvents
                billingRepository.countUsageEvents = originalCountEvents
            }
        })
    })

    describe('redeemCode', () => {
        it('should throw AppError 400 for empty code', async () => {
            await expect(
                billingService.redeemCode({ userId: 'user-1', code: '  ' })
            ).rejects.toThrow(new AppError('redeem code cannot be empty', 400))
        })

        it('should hash code, redeem via repository, and send notification', async () => {
            const originalRedeem = billingRepository.redeemCode
            const originalSendNotif = notificationService.sendNotificationToUser

            let receivedCodeHash = ''
            billingRepository.redeemCode = (async (data: any) => {
                receivedCodeHash = data.codeHash
                return { creditAmount: 1500, newBalance: 6500 }
            }) as any

            let notificationSent = false
            notificationService.sendNotificationToUser = (async () => {
                notificationSent = true
                return {} as any
            }) as any

            try {
                const res = await billingService.redeemCode({ userId: 'user-1', code: 'gift100' })

                const expectedHash = crypto.createHash('sha256').update('GIFT100').digest('hex')
                expect(receivedCodeHash).toBe(expectedHash)
                expect(res.creditAmount).toBe(1500)
                expect(notificationSent).toBe(true)
            } finally {
                billingRepository.redeemCode = originalRedeem
                notificationService.sendNotificationToUser = originalSendNotif
            }
        })
    })

    describe('addCredits', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFindUser = billingRepository.findUserByIdForCredits
            billingRepository.findUserByIdForCredits = (async () => null) as any

            try {
                await expect(
                    billingService.addCredits({
                        userId: 'user-999',
                        amountInCents: 2000,
                        paymentMethod: 'card',
                    })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                billingRepository.findUserByIdForCredits = originalFindUser
            }
        })

        it('should add credits and send purchase notification', async () => {
            const originalFindUser = billingRepository.findUserByIdForCredits
            const originalAddCredits = billingRepository.addCredits
            const originalSendNotif = notificationService.sendNotificationToUser

            billingRepository.findUserByIdForCredits = (async () => ({ id: 'user-1' })) as any
            billingRepository.addCredits = (async () => ({
                id: 'user-1',
                creditBalance: 7000,
            })) as any

            let notificationSent = false
            notificationService.sendNotificationToUser = (async () => {
                notificationSent = true
                return {} as any
            }) as any

            try {
                const res = await billingService.addCredits({
                    userId: 'user-1',
                    amountInCents: 2000,
                    paymentMethod: 'card',
                })

                expect(res.amountInCents).toBe(2000)
                expect(res.newBalance).toBe(7000)
                expect(notificationSent).toBe(true)
            } finally {
                billingRepository.findUserByIdForCredits = originalFindUser
                billingRepository.addCredits = originalAddCredits
                notificationService.sendNotificationToUser = originalSendNotif
            }
        })
    })
})
