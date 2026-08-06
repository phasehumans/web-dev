import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { saveCanvasSchema, webClipRequestSchema } from './canvas.schema'
import { canvasService } from './canvas.service'

import type { Request, Response } from 'express'

const createWebClips = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    if (!userId) {
        throw new AppError('unauthorized', 400)
    }

    const parseData = webClipRequestSchema.parse(req.body)
    const { url, sessionId, projectId } = parseData

    const result = await canvasService.createWebClips({ url, userId, sessionId, projectId })
    return sendSuccess(res, 'web clips created successfully', result)
})

const saveCanvas = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    if (!userId) {
        throw new AppError('unauthorized', 400)
    }

    const parseData = saveCanvasSchema.parse(req.body)

    const result = await canvasService.saveCanvas({
        userId,
        ...parseData,
    })
    return sendSuccess(res, 'canvas saved successfully', result)
})

export const canvasController = {
    createWebClips,
    saveCanvas,
}
