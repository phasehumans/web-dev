import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import {
    creditsHistoryQuerySchema,
    redeemCodeSchema,
    createRazorpayOrderSchema,
    verifyRazorpayPaymentSchema,
} from './billing.schema'
import { billingService } from './billing.service'

import type { Request, Response } from 'express'

const getOverview = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await billingService.getOverview({ userId })
    return sendSuccess(res, 'billing overview fetched successfully', result)
})

const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedBody = createRazorpayOrderSchema.parse(req.body)

    const result = await billingService.createRazorpayOrder({
        userId,
        ...parsedBody,
    })
    return sendSuccess(res, 'razorpay order created successfully', result, 201)
})

const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedBody = verifyRazorpayPaymentSchema.parse(req.body)

    const result = await billingService.verifyRazorpayPayment({
        userId,
        ...parsedBody,
    })
    return sendSuccess(res, 'payment verified successfully', result)
})

const getCreditsHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedQuery = creditsHistoryQuerySchema.parse(req.query)
    const limit = parsedQuery.limit
    const offset = parsedQuery.offset

    const result = await billingService.getCreditsHistory({
        userId,
        limit,
        offset,
        periodStart: parsedQuery.periodStart,
        periodEnd: parsedQuery.periodEnd,
    })
    return sendSuccess(res, 'credits history fetched successfully', result)
})

const redeemCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedBody = redeemCodeSchema.parse(req.body)

    const result = await billingService.redeemCode({
        userId,
        ...parsedBody,
    })
    return sendSuccess(res, 'code redeemed successfully', result)
})

const addCredits = asyncHandler(async (req: Request, res: Response) => {
    // Manual credit additions without payment gateway verification are disabled in public APIs.
    throw new AppError('Direct credit addition is disabled. Please use payment checkout.', 403)
})

export const billingController = {
    getOverview,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getCreditsHistory,
    redeemCode,
    addCredits,
}
