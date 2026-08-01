import { z } from 'zod'

export const CreateSecretSchema = z.object({
    name: z.string().min(1),
    value: z.string().min(1),
    note: z.string().optional(),
})

export const BulkCreateSecretsSchema = z.object({
    secrets: z
        .array(
            z.object({
                name: z.string().min(1),
                value: z.string().min(1),
                note: z.string().optional(),
            })
        )
        .min(1),
})

export type CreateSecretDto = z.infer<typeof CreateSecretSchema>
export type BulkCreateSecretsDto = z.infer<typeof BulkCreateSecretsSchema>
