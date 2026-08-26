import { Router } from 'express'

import { env } from '../../env'
import { authMiddleware } from '../../middleware/auth.middleware'
import { createRateLimiter } from '../../middleware/rate-limiter'

import { billingController } from './billing.controller'

const billingRouter = Router()

billingRouter.post(
    '/webhook/razorpay',
    createRateLimiter({
        windowMs: 60 * 1000,
        max: env.NODE_ENV === 'test' ? 1000 : 120,
        message: 'Too many webhook requests.',
    }),
    billingController.handleRazorpayWebhook
)

billingRouter.use(authMiddleware)
billingRouter.get('/overview', billingController.getOverview)
billingRouter.get('/credits/history', billingController.getCreditsHistory)

billingRouter.post(
    '/wallet/order/razorpay',
    createRateLimiter({
        windowMs: 60 * 1000,
        max: env.NODE_ENV === 'test' ? 1000 : 15,
        message: 'Too many order requests. Please try again in a minute.',
    }),
    billingController.createRazorpayOrder
)

billingRouter.post(
    '/wallet/verify/razorpay',
    createRateLimiter({
        windowMs: 60 * 1000,
        max: env.NODE_ENV === 'test' ? 1000 : 30,
        message: 'Too many verification attempts. Please try again in a minute.',
    }),
    billingController.verifyRazorpayPayment
)

billingRouter.post(
    '/redeem-code',
    createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: env.NODE_ENV === 'test' ? 1000 : 3,
        message: 'Too many redemption attempts. Please try again in 15 minutes.',
    }),
    billingController.redeemCode
)

export default billingRouter
