import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { CompleteHandoffSchema } from './cli.schema'
import { cliService } from './cli.service'

import type { Request, Response } from 'express'

const chatCompletions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const body = req.body

    const hasBalance = await cliService.verifyWalletBalance({ userId })
    if (!hasBalance) {
        throw new AppError(
            'Insufficient credits in December Wallet. Please add credits at https://trydecember.com/settings/billing to continue using December Cloud.',
            402
        )
    }

    await cliService.proxyChatCompletions({ userId, body, res })
})

const getHandoffUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const data = await cliService.generateHandoffUrl({ userId })
    return sendSuccess(res, 'handoff upload url generated', data)
})

const completeHandoff = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const parsed = CompleteHandoffSchema.parse(req.body)
    const session = await cliService.completeHandoff({
        userId,
        title: parsed.title,
        messages: parsed.messages,
        objectKey: parsed.objectKey,
    })
    return sendSuccess(res, 'handoff completed successfully', session, 201)
})

export const cliController = {
    chatCompletions,
    getHandoffUploadUrl,
    completeHandoff,
}
