import { z } from 'zod'

export const getSessionsSchema = z.object({
    type: z.enum(['WEB', 'CLI', 'SEARCH']).optional(),
    isArchived: z
        .preprocess(
            (val) => (val === 'true' ? true : val === 'false' ? false : undefined),
            z.boolean().optional()
        )
        .optional(),
    tags: z.string().optional(),
    sortBy: z.enum(['updatedAt', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    page: z.preprocess(
        (val) => (val !== undefined && val !== '' ? Number(val) : undefined),
        z.number().int().min(1).optional()
    ),
    limit: z.preprocess(
        (val) => (val !== undefined && val !== '' ? Number(val) : undefined),
        z.number().int().min(1).max(100).optional()
    ),
})

export const createSessionSchema = z.object({
    title: z.string().max(100).optional(),
    type: z.enum(['WEB', 'CLI', 'SEARCH']).optional(),
    prompt: z.string().min(1, 'prompt is required').optional(),
    projectId: z.string().uuid().optional(),
})

export const getSessionByIdSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const renameSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})
export const renameSessionBodySchema = z.object({
    title: z.string().min(1, 'title is required').max(100),
})

export const archiveSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const unarchiveSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const updateSessionTagsParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})
export const updateSessionTagsBodySchema = z.object({
    tags: z.array(z.string().max(30)).max(1, 'Only one tag is allowed per session'),
})

export const getSessionInsightsParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const deleteSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const getCollaboratorsParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const addCollaboratorParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})
export const addCollaboratorBodySchema = z.object({
    email: z.string({ message: 'email is required' }).email('please enter a valid email address'),
})

export const removeCollaboratorParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
    email: z.string().email('please enter a valid email address'),
})

export const disconnectSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const rehydrateSessionParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const proxyPreviewParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
    port: z.preprocess((val) => Number(val), z.number().int().min(1).max(65535)),
})

export const streamSearchResponseParamsSchema = z.object({
    id: z.string().uuid('Invalid session ID'),
})

export const streamSearchResponseBodySchema = z.object({
    prompt: z.string().min(1, 'prompt is required'),
    messageHistory: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant', 'system']),
                content: z.string(),
            })
        )
        .optional(),
})
