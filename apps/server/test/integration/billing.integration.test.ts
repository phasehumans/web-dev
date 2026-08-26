import crypto from 'crypto'

import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll, spyOn } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { razorpay } from '../../src/config/razorpay'

describe('Billing Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    const razorpaySecret = 'test_razorpay_secret_key_123'

    beforeAll(async () => {
        process.env.RAZORPAY_KEY_ID = 'rzp_test_key_123'
        process.env.RAZORPAY_KEY_SECRET = razorpaySecret

        testEmail = `billingtest-${Date.now()}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Billing Test User',
                username: `billinguser_${Date.now()}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
                creditBalance: 1000, // $10 initial balance
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: 'test-hash-' + Date.now(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.redeemCodeClaim
                .deleteMany({ where: { userId: testUserId } })
                .catch(() => {})
            await prisma.walletTransaction
                .deleteMany({ where: { userId: testUserId } })
                .catch(() => {})
            await prisma.usageEvent.deleteMany({ where: { userId: testUserId } }).catch(() => {})
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {})
            await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
        }
    })

    it('GET /api/v1/billing/overview - returns 401 when unauthorized', async () => {
        const res = await request(app).get('/api/v1/billing/overview')
        expect(res.status).toBe(401)
    })

    it('GET /api/v1/billing/overview - returns overview for authenticated user', async () => {
        const res = await request(app)
            .get('/api/v1/billing/overview')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.creditBalance).toBe(1000)
        expect(res.body.data.usdToInrRate).toBeDefined()
        expect(res.body.data.usage).toBeDefined()
        expect(res.body.data.transactions).toBeArray()
    })

    it('POST /api/v1/billing/wallet/order/razorpay - rejects amount below minimum ($1.00)', async () => {
        const res = await request(app)
            .post('/api/v1/billing/wallet/order/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amountInCents: 50 })

        expect(res.status).toBe(400)
    })

    let createdOrderId = ''

    it('POST /api/v1/billing/wallet/order/razorpay - creates Razorpay order and pending wallet transaction', async () => {
        createdOrderId = `order_${Date.now()}`
        spyOn(razorpay.orders, 'create').mockImplementation((async () => ({
            id: createdOrderId,
            amount: 190520,
            currency: 'INR',
        })) as any)

        const res = await request(app)
            .post('/api/v1/billing/wallet/order/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ amountInCents: 2000 })

        expect(res.status).toBe(201)
        expect(res.body.data.orderId).toBe(createdOrderId)
        expect(res.body.data.keyId).toBe('rzp_test_key_123')
        expect(res.body.data.usdToInrRate).toBeDefined()

        const dbTx = await prisma.walletTransaction.findFirst({
            where: { providerOrderId: createdOrderId },
        })
        expect(dbTx).not.toBeNull()
        expect(dbTx?.status).toBe('PENDING')
        expect(dbTx?.amountInCents).toBe(2000)
    })

    it('POST /api/v1/billing/wallet/verify/razorpay - rejects invalid signature', async () => {
        const res = await request(app)
            .post('/api/v1/billing/wallet/verify/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                razorpay_order_id: createdOrderId,
                razorpay_payment_id: 'pay_123',
                razorpay_signature: 'invalid_sig',
            })

        expect(res.status).toBe(400)
    })

    it('POST /api/v1/billing/wallet/verify/razorpay - verifies payment, updates status & credit balance', async () => {
        const paymentId = `pay_${Date.now()}`
        const signature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${createdOrderId}|${paymentId}`)
            .digest('hex')

        const res = await request(app)
            .post('/api/v1/billing/wallet/verify/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                razorpay_order_id: createdOrderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.success).toBe(true)
        expect(res.body.data.newBalance).toBe(3000) // 1000 + 2000 = 3000

        const dbTx = await prisma.walletTransaction.findFirst({
            where: { providerOrderId: createdOrderId },
        })
        expect(dbTx?.status).toBe('SUCCESS')
    })

    it('POST /api/v1/billing/wallet/verify/razorpay - is idempotent on already verified order', async () => {
        const paymentId = `pay_dup_${Date.now()}`
        const signature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${createdOrderId}|${paymentId}`)
            .digest('hex')

        const res = await request(app)
            .post('/api/v1/billing/wallet/verify/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                razorpay_order_id: createdOrderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.success).toBe(true)
        expect(res.body.data.alreadyProcessed).toBe(true)
    })

    it('POST /api/v1/billing/wallet/verify/razorpay - recovers and fulfills order previously marked FAILED by failed attempt', async () => {
        const failedOrderId = `order_failed_then_retry_${Date.now()}`
        const retryPaymentId = `pay_retry_${Date.now()}`

        // Create transaction in FAILED status (simulating first attempt failure)
        await prisma.walletTransaction.create({
            data: {
                userId: testUserId,
                amountInCents: 2000,
                currency: 'USD',
                provider: 'RAZORPAY',
                providerOrderId: failedOrderId,
                status: 'FAILED',
            },
        })

        const retrySignature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${failedOrderId}|${retryPaymentId}`)
            .digest('hex')

        const res = await request(app)
            .post('/api/v1/billing/wallet/verify/razorpay')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                razorpay_order_id: failedOrderId,
                razorpay_payment_id: retryPaymentId,
                razorpay_signature: retrySignature,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.success).toBe(true)
        expect(res.body.data.newBalance).toBe(5000) // 3000 + 2000 = 5000

        const dbTx = await prisma.walletTransaction.findFirst({
            where: { providerOrderId: failedOrderId },
        })
        expect(dbTx?.status).toBe('SUCCESS')
        expect(dbTx?.providerPaymentId).toBe(retryPaymentId)
    })

    it('GET /api/v1/billing/credits/history - returns usage and credit history', async () => {
        const res = await request(app)
            .get('/api/v1/billing/credits/history?limit=10&offset=0')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.events).toBeArray()
        expect(res.body.data.limit).toBe(10)
    })

    it('POST /api/v1/billing/credits/add - returns 404 as dead route is removed', async () => {
        const res = await request(app)
            .post('/api/v1/billing/credits/add')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                amountInCents: 2500,
                paymentMethod: 'card',
            })

        expect(res.status).toBe(404)
    })

    it('POST /api/v1/billing/redeem-code - redeems a valid code and increases balance', async () => {
        const rawCode = `TESTGIFT-${Date.now()}`
        const codeHash = crypto.createHash('sha256').update(rawCode.toUpperCase()).digest('hex')

        const redeemCode = await prisma.redeemCode.create({
            data: {
                codeHash,
                creditAmount: 1500,
                maxRedemptions: 5,
                metadata: { code: rawCode },
            },
        })

        const res = await request(app)
            .post('/api/v1/billing/redeem-code')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ code: rawCode })

        expect(res.status).toBe(200)
        expect(res.body.data.creditAmount).toBe(1500)
        expect(res.body.data.newBalance).toBe(6500) // 5000 + 1500 = 6500

        // Cleanup redeem code
        await prisma.redeemCodeClaim.deleteMany({ where: { redeemCodeId: redeemCode.id } })
        await prisma.redeemCode.delete({ where: { id: redeemCode.id } })
    })

    it('POST /api/v1/billing/webhook/razorpay - rejects missing or invalid signature', async () => {
        process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_key'

        const res = await request(app)
            .post('/api/v1/billing/webhook/razorpay')
            .send({ event: 'payment.captured' })

        expect(res.status).toBe(400)
    })

    it('POST /api/v1/billing/webhook/razorpay - processes valid payment.captured webhook and is idempotent', async () => {
        const webhookSecret = 'test_webhook_secret_key'
        process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret

        const webhookOrderId = `order_wh_${Date.now()}`
        const webhookPaymentId = `pay_wh_${Date.now()}`

        // Create pending transaction
        await prisma.walletTransaction.create({
            data: {
                userId: testUserId,
                amountInCents: 2000,
                currency: 'USD',
                provider: 'RAZORPAY',
                providerOrderId: webhookOrderId,
                status: 'PENDING',
            },
        })

        const payload = {
            event: 'payment.captured',
            payload: {
                payment: {
                    entity: {
                        id: webhookPaymentId,
                        order_id: webhookOrderId,
                        amount: 190520,
                    },
                },
            },
        }

        const rawBody = JSON.stringify(payload)
        const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

        const res = await request(app)
            .post('/api/v1/billing/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .send(payload)

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe('processed')

        const dbTx = await prisma.walletTransaction.findFirst({
            where: { providerOrderId: webhookOrderId },
        })
        expect(dbTx?.status).toBe('SUCCESS')
        expect(dbTx?.providerPaymentId).toBe(webhookPaymentId)

        // Repeat webhook call - verify idempotency
        const resDup = await request(app)
            .post('/api/v1/billing/webhook/razorpay')
            .set('x-razorpay-signature', signature)
            .send(payload)

        expect(resDup.status).toBe(200)
        expect(resDup.body.data.status).toBe('already_processed')
    })
})
