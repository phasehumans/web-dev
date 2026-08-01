import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { CreateSecretSchema, BulkCreateSecretsSchema } from './secrets.schema'
import { secretsService } from './secrets.service'

import type { Request, Response } from 'express'

const getSecrets = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) throw new AppError('unauthorized', 401)

    const secrets = await secretsService.getSecrets({ userId })
    return sendSuccess(res, 'secrets fetched successfully', { secrets })
})

const getSecretValue = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) throw new AppError('unauthorized', 401)

    const name = req.params.name as string
    if (!name) throw new AppError('secret name is required', 400)

    const secret = await secretsService.getSecretValue({ userId, name })
    return sendSuccess(res, 'secret value fetched successfully', { secret })
})

const createSecret = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) throw new AppError('unauthorized', 401)

    const data = CreateSecretSchema.parse(req.body)
    const secret = await secretsService.createSecret({
        userId,
        name: data.name,
        value: data.value,
        note: data.note,
    })
    return sendSuccess(
        res,
        'secret created successfully',
        { secret: { id: secret.id, name: secret.name, note: secret.note } },
        201
    )
})

const bulkCreateSecrets = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) throw new AppError('unauthorized', 401)

    const data = BulkCreateSecretsSchema.parse(req.body)
    await secretsService.bulkCreateSecrets({
        userId,
        secrets: data.secrets,
    })
    return sendSuccess(res, 'secrets created successfully', null, 201)
})

const deleteSecret = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    if (!userId) throw new AppError('unauthorized', 401)

    const name = req.params.name as string
    if (!name) throw new AppError('secret name is required', 400)

    await secretsService.deleteSecret({ userId, name })
    return sendSuccess(res, 'secret deleted successfully', null)
})

export const secretsController = {
    getSecrets,
    getSecretValue,
    createSecret,
    bulkCreateSecrets,
    deleteSecret,
}
