import { z } from 'zod'

export const ChatCompletionsSchema = z
    .object({
        model: z.string().optional(),
        messages: z.array(z.any()).min(1, 'Messages array must contain at least one message'),
        stream: z.boolean().optional(),
        temperature: z.number().optional(),
        max_tokens: z.number().optional(),
    })
    .passthrough()

export type ChatCompletionsDto = z.infer<typeof ChatCompletionsSchema>

export const CompleteHandoffSchema = z.object({
    title: z.string().optional(),
    messages: z.array(z.any()).optional(),
    objectKey: z.string().optional(),
})

export type CompleteHandoffDto = z.infer<typeof CompleteHandoffSchema>
