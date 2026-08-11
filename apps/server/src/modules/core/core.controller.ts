import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { HandlePromptSchema } from './core.schema'
import { coreService } from './core.service'

import type { Request, Response } from 'express'

const handlePrompt = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const data = HandlePromptSchema.parse(req.body)
    const result = await coreService.processPromptJob({
        userId,
        prompt: data.prompt,
        projectId: data.projectId,
        sessionId: data.sessionId,
    })

    return sendSuccess(res, 'job enqueued', result)
})

export const coreController = {
    handlePrompt,
}
