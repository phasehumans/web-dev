import crypto from 'crypto'

import { razorpay } from '../../config/razorpay'
import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { notificationService } from '../notification/notification.service'

import { billingRepository } from './billing.repository'
import {
    getRazorpayKeyId,
    verifyRazorpayOrderPayment,
    verifyRazorpayWebhookSignature,
} from './billing.utils'

import type {
    GetOverview,
    CreateRazorpayOrder,
    VerifyRazorpayPayment,
    CreditsHistory,
    AddCredits,
    RedeemCode,
    HandleRazorpayWebhook,
} from './billing.types'

const getOverview = async (data: GetOverview) => {
    const { userId } = data
    const user = await billingRepository.findUserForOverview(userId)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    const periodStart = user.createdAt
    const periodEnd = new Date()
    const aggregate = await billingRepository.aggregateUsage(userId, periodStart, periodEnd)
    const usedInCents = aggregate._sum.costInCents ?? 0
    const claims = ((user as any).redeemClaims || []).map((claim: any) => ({
        id: claim.id,
        createdAt: claim.redeemedAt,
        amountInCents: claim.redeemCode.creditAmount,
        code: (claim.redeemCode.metadata as any)?.code || 'GIFT',
    }))

    const giftedCredits = claims.reduce((sum: number, claim: any) => sum + claim.amountInCents, 0)
    const USD_TO_INR_RATE = env.USD_TO_INR_RATE ?? 95.26

    return {
        creditBalance: user.creditBalance,
        giftedCredits,
        createdAt: user.createdAt,
        usdToInrRate: USD_TO_INR_RATE,
        usage: {
            inputTokens: aggregate._sum.inputTokens ?? 0,
            outputTokens: aggregate._sum.outputTokens ?? 0,
            totalTokens: aggregate._sum.totalTokens ?? 0,
            costInCents: usedInCents,
        },
        claims,
        transactions: ((user as any).walletTransactions || []).map((tx: any) => ({
            id: tx.id,
            createdAt: tx.createdAt,
            amountInCents: tx.amountInCents,
            currency: tx.currency,
            provider: tx.provider,
            status: tx.status,
        })),
    }
}

const createRazorpayOrder = async (data: CreateRazorpayOrder) => {
    const { userId, amountInCents } = data

    // razorpay requires inr to enable upi and domestic payment options.
    // convert usd cents to inr paise using configurable USD_TO_INR_RATE.
    const USD_TO_INR_RATE = env.USD_TO_INR_RATE ?? 95.26
    const amountInPaise = Math.round(amountInCents * USD_TO_INR_RATE)
    const keyId = getRazorpayKeyId()

    let order: any
    try {
        order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            notes: {
                userId,
                amountInCents: amountInCents.toString(),
            },
        })
    } catch (err: any) {
        console.error('[Razorpay Order Creation Error]:', err)
        const desc =
            err?.error?.description ||
            err?.error?.message ||
            err?.message ||
            'Razorpay order creation failed'

        if (
            err?.statusCode === 401 ||
            (typeof desc === 'string' && desc.toLowerCase().includes('auth'))
        ) {
            throw new AppError(
                'Payment gateway authentication failed. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET credentials.',
                502
            )
        }

        throw new AppError(`Failed to create payment order: ${desc}`, 502)
    }

    await billingRepository.createWalletTransaction({
        userId,
        amountInCents, // we keep the usd cents for the user's wallet credit amount
        currency: 'USD',
        provider: 'RAZORPAY',
        providerOrderId: order.id,
    })

    return {
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        usdToInrRate: USD_TO_INR_RATE,
    }
}

const verifyRazorpayPayment = async (data: VerifyRazorpayPayment) => {
    const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = data

    const isValid = verifyRazorpayOrderPayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    })

    if (!isValid) {
        throw new AppError('invalid razorpay signature', 400)
    }

    const transaction = await billingRepository.findWalletTransactionByOrderId(razorpay_order_id)
    if (!transaction) {
        console.error(
            '[Razorpay Verify Error]: Transaction not found for orderId:',
            razorpay_order_id
        )
        throw new AppError('transaction order not found', 404)
    }

    if (transaction.userId !== userId) {
        throw new AppError('unauthorized to verify this transaction', 403)
    }

    if (transaction.status === 'SUCCESS') {
        const user = await billingRepository.findUserById(userId)
        return {
            success: true,
            alreadyProcessed: true,
            newBalance: (user as any)?.creditBalance,
        }
    }

    const result = await billingRepository.verifyAndUpdateWalletTransaction(
        transaction.id,
        userId,
        transaction.amountInCents,
        razorpay_payment_id
    )

    if (result.alreadyProcessed) {
        return {
            success: true,
            alreadyProcessed: true,
            newBalance: result.user.creditBalance,
        }
    }

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Credits Added',
            message: `Successfully added $${(transaction.amountInCents / 100).toFixed(2)} to your wallet!`,
            type: 'SUCCESS',
        })
    } catch (err) {
        console.error('Failed to send notification:', err)
    }

    return {
        success: true,
        newBalance: result.user.creditBalance,
    }
}

const getCreditsHistory = async (data: CreditsHistory) => {
    const { userId, limit, offset, periodStart, periodEnd } = data
    const user = await billingRepository.findUserById(userId)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    const where: any = {
        userId,
    }

    if (periodStart && periodEnd) {
        where.createdAt = {
            gte: new Date(periodStart),
            lte: new Date(periodEnd),
        }
    } else if (periodStart) {
        where.createdAt = {
            gte: new Date(periodStart),
        }
    } else if (periodEnd) {
        where.createdAt = {
            lte: new Date(periodEnd),
        }
    }

    const [events, total] = await Promise.all([
        billingRepository.findManyUsageEvents(where, offset, limit),
        billingRepository.countUsageEvents(where),
    ])

    const periods = new Map<string, { periodStart: Date; periodEnd: Date; costInCents: number }>()

    for (const event of events) {
        const start = event.periodStart ? new Date(event.periodStart) : new Date()
        const end = event.periodEnd ? new Date(event.periodEnd) : new Date()
        const key = start.toISOString()
        const period = periods.get(key) ?? {
            periodStart: start,
            periodEnd: end,
            costInCents: 0,
        }

        period.costInCents += event.costInCents
        periods.set(key, period)
    }

    return {
        events,
        total,
        limit,
        offset,
        periods: Array.from(periods.values()),
    }
}

const redeemCode = async (data: RedeemCode) => {
    const { userId, code } = data

    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
        throw new AppError('redeem code cannot be empty', 400)
    }

    const codeHash = crypto.createHash('sha256').update(normalizedCode).digest('hex')

    const result = await billingRepository.redeemCode({ userId, codeHash })

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Code Redeemed Successfully',
            message: `Successfully claimed $${(result.creditAmount / 100).toFixed(2)} in gifted credits!`,
            type: 'SUCCESS',
        })
    } catch (err) {
        console.error('Failed to send redemption notification:', err)
    }

    return result
}

const addCredits = async (data: AddCredits) => {
    const { userId, amountInCents, paymentMethod } = data

    const user = await billingRepository.findUserByIdForCredits(userId)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    const updatedUser = await billingRepository.addCredits(userId, amountInCents)

    try {
        await notificationService.sendNotificationToUser({
            userId,
            title: 'Credits Added Successfully',
            message: `Successfully purchased $${(amountInCents / 100).toFixed(2)} in credits using ${paymentMethod.toUpperCase()}!`,
            type: 'SUCCESS',
        })
    } catch (err) {
        console.error('Failed to send purchase notification:', err)
    }

    return {
        amountInCents,
        newBalance: updatedUser.creditBalance,
    }
}

const handleRazorpayWebhook = async (data: HandleRazorpayWebhook) => {
    const { rawBody, signature, eventPayload } = data

    const isValid = verifyRazorpayWebhookSignature({
        rawBody,
        signature,
    })

    if (!isValid) {
        throw new AppError('invalid razorpay webhook signature', 400)
    }

    const event = eventPayload?.event
    const paymentEntity = eventPayload?.payload?.payment?.entity
    const orderEntity = eventPayload?.payload?.order?.entity

    if (event === 'payment.captured' || event === 'order.paid') {
        const orderId = paymentEntity?.order_id || orderEntity?.id
        const paymentId = paymentEntity?.id || 'webhook_captured'

        if (!orderId) {
            return { received: true, status: 'ignored_no_order_id' }
        }

        const transaction = await billingRepository.findWalletTransactionByOrderId(orderId)
        if (!transaction) {
            return { received: true, status: 'order_not_found' }
        }

        if (transaction.status === 'SUCCESS') {
            return { received: true, status: 'already_processed' }
        }

        const result = await billingRepository.verifyAndUpdateWalletTransaction(
            transaction.id,
            transaction.userId,
            transaction.amountInCents,
            paymentId
        )

        if (result.alreadyProcessed) {
            return { received: true, status: 'already_processed' }
        }

        try {
            await notificationService.sendNotificationToUser({
                userId: transaction.userId,
                title: 'Credits Added',
                message: `Successfully added $${(transaction.amountInCents / 100).toFixed(2)} to your wallet!`,
                type: 'SUCCESS',
            })
        } catch (err) {
            console.error('Failed to send webhook notification:', err)
        }

        return {
            received: true,
            status: 'processed',
            newBalance: result.user.creditBalance,
        }
    }

    if (event === 'payment.failed') {
        const orderId = paymentEntity?.order_id
        const paymentId = paymentEntity?.id
        const errorDescription =
            paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed'

        if (orderId) {
            const transaction = await billingRepository.findWalletTransactionByOrderId(orderId)
            if (transaction && transaction.status === 'PENDING') {
                await billingRepository.updateWalletTransaction(transaction.id, {
                    status: 'FAILED',
                    providerPaymentId: paymentId,
                    metadata: { error: errorDescription },
                })
                return { received: true, status: 'failed_recorded' }
            }
        }
    }

    return { received: true, status: 'ignored' }
}

export const billingService = {
    getOverview,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getCreditsHistory,
    redeemCode,
    addCredits,
    handleRazorpayWebhook,
}
