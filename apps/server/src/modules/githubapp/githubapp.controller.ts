import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { githubAppService } from './githubapp.service'

import type { Request, Response } from 'express'

const startInstall = asyncHandler(async (req: Request, res: Response) => {
    const appName = process.env.GITHUB_APP_NAME || 'december-bot'
    return res.redirect(`https://github.com/apps/${appName}/installations/new`)
})

const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string
    if (!signature) {
        throw new AppError('Missing signature', 401)
    }

    const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body)

    if (!githubAppService.verifySignature({ payload: rawBody, signature })) {
        throw new AppError('Invalid signature', 401)
    }

    const payload =
        typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawBody)
    const event = req.headers['x-github-event']

    if (event === 'installation' && payload.action === 'created') {
        const installationId = payload.installation.id.toString()
        const userId = 'system'
        await githubAppService.processInstallation({ installationId, userId })
    } else if (event === 'installation' && payload.action === 'deleted') {
        const installationId = payload.installation.id.toString()
        await githubAppService.processUninstallation({ installationId })
    }

    return sendSuccess(res, 'webhook processed successfully', null)
})

export const githubAppController = {
    startInstall,
    handleWebhook,
}
