import { z } from 'zod'

export const usageCheckQuerySchema = z.object({
    estimatedCostInCents: z.coerce.number().int().min(0).optional(),
})

export const recordUsageEventSchema = z
    .object({
        model: z.string().trim().min(1).max(100),
        inputTokens: z.number().int().min(0).default(0),
        outputTokens: z.number().int().min(0).default(0),
        totalTokens: z.number().int().min(0).optional(),
        costInCents: z.number().int().min(0).default(0),
        sessionId: z.string().uuid().optional(),
        chatId: z.string().trim().min(1).max(100).optional(),
        externalRequestId: z.string().trim().min(1).max(255).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .strict()
    .transform((data) => ({
        ...data,
        totalTokens: data.totalTokens ?? data.inputTokens + data.outputTokens,
    }))
