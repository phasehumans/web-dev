import { z } from 'zod'

export const createRazorpayOrderSchema = z
    .object({
        amountInCents: z
            .number()
            .int()
            .min(100, { message: 'Minimum amount is $1.00' })
            .max(5000, { message: 'Maximum amount is $50.00' }), // min $1.00, max $50.00
        currency: z.string().trim().length(3).default('USD'),
    })
    .strict()

export const verifyRazorpayPaymentSchema = z
    .object({
        razorpay_order_id: z.string().trim().min(1),
        razorpay_payment_id: z.string().trim().min(1),
        razorpay_signature: z.string().trim().min(1),
    })
    .strict()

export const creditsHistoryQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
})

export const redeemCodeSchema = z
    .object({
        code: z.string().trim().min(1, { message: 'redeem code cannot be empty' }),
    })
    .strict()

export const addCreditsSchema = z
    .object({
        amountInCents: z.number().int().min(100).max(5000),
        paymentMethod: z.enum(['card', 'upi', 'crypto']),
    })
    .strict()
