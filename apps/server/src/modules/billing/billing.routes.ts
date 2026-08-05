import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'
import { createRateLimiter } from '../../middleware/rate-limiter'

import { billingController } from './billing.controller'

const billingRouter = Router()

billingRouter.use(authMiddleware)
billingRouter.get('/overview', billingController.getOverview)
billingRouter.get('/credits/history', billingController.getCreditsHistory)
billingRouter.post('/credits/add', billingController.addCredits)

billingRouter.post('/wallet/order/razorpay', billingController.createRazorpayOrder)
billingRouter.post('/wallet/verify/razorpay', billingController.verifyRazorpayPayment)

billingRouter.post(
    '/redeem-code',
    createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 3,
        message: 'Too many redemption attempts. Please try again in 15 minutes.',
    }),
    billingController.redeemCode
)

export default billingRouter
