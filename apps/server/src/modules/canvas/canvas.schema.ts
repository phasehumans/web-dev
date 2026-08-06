import { z } from 'zod'

export const canvasItemTypeSchema = z.enum([
    'note',
    'image',
    'link',
    'frame',
    'square',
    'circle',
    'line',
    'arrow',
    'pen',
    'text',
])

export const canvasPointSchema = z.object({
    x: z.number(),
    y: z.number(),
})

export const canvasAssetSourceSchema = z.enum(['temporary', 'project'])
export const canvasAssetKindSchema = z.enum(['upload', 'web-clip'])

export const canvasItemSchema = z.object({
    id: z.string().min(1),
    type: canvasItemTypeSchema,
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    content: z.string().optional(),
    color: z.string().optional(),
    points: z.array(canvasPointSchema).optional(),
    parentId: z.string().optional(),
    assetKey: z.string().optional(),
    assetSource: canvasAssetSourceSchema.optional(),
    assetContentType: z.string().optional(),
    assetKind: canvasAssetKindSchema.optional(),
})

export const canvasConnectionSchema = z.object({
    id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    fromSide: z.enum(['left', 'right']),
    toSide: z.enum(['left', 'right']),
})

export const canvasDocumentSchema = z.object({
    items: z.array(canvasItemSchema).default([]),
    connections: z.array(canvasConnectionSchema).default([]),
    pan: canvasPointSchema.default({ x: 0, y: 0 }),
    scale: z.number().default(100),
    hasInteracted: z.boolean().default(false),
})

export type CanvasDocument = z.infer<typeof canvasDocumentSchema>

export const webClipRequestSchema = z.object({
    url: z
        .string()
        .trim()
        .url()
        .refine(
            (value) => value.startsWith('http://') || value.startsWith('https://'),
            'URL must start with http:// or https://'
        ),
    sessionId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
})

export const saveCanvasSchema = z
    .object({
        sessionId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
        canvasState: canvasDocumentSchema,
    })
    .refine((data) => data.sessionId || data.projectId, {
        message: 'Either sessionId or projectId must be provided',
    })
