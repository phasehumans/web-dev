import { z } from 'zod'

export const createRazorpayOrderSchema = z
    .object({
        amountInCents: z
            .number()
            .int()
            .min(2000, { message: 'Minimum amount is $20.00' })
            .max(10000, { message: 'Maximum amount is $100.00' }), // min $20.00, max $100.00
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
        amountInCents: z.number().int().min(2000).max(10000),
        paymentMethod: z.enum(['card', 'upi', 'crypto']),
    })
    .strict()
