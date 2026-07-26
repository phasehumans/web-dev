import { z } from 'zod'

export const evalTaskSchema = z.object({
    id: z.string().min(1, 'Task id is required'),
    name: z.string().min(1, 'Task name is required'),
    description: z.string().default(''),
    prompt: z.string().min(1, 'Prompt is required'),
    workspaceSnapshot: z.string().optional(),
    validationScript: z.string().min(1, 'Validation script is required'),
    timeoutMs: z.number().positive().optional(),
    maxTurns: z.number().positive().optional(),
    env: z.record(z.string()).optional(),
})

export type EvalTaskSchema = z.infer<typeof evalTaskSchema>
