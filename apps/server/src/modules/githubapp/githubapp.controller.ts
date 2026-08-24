import { prisma } from '@december/database'

import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { githubAppService } from './githubapp.service'

import type { Request, Response } from 'express'

const startInstall = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?.id
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const appName = env.GITHUB_APP_NAME || 'december-bot'
    const returnUrl = (req.query.returnUrl as string) || '/profile/integrations'
    const state = encodeURIComponent(`${userId}|${returnUrl}`)

    return res.redirect(`https://github.com/apps/${appName}/installations/new?state=${state}`)
})

const handleCallback = asyncHandler(async (req: Request, res: Response) => {
    const installationId = req.query.installation_id as string
    const state = req.query.state as string
    const setupAction = req.query.setup_action as string

    let userId: string | null = null
    let returnUrl = '/profile/integrations'

    if (state) {
        const decoded = decodeURIComponent(state)
        const parts = decoded.split('|')
        userId = parts[0] || null
        if (parts[1]) {
            returnUrl = parts[1]
        }
    }

    if (installationId && userId) {
        await githubAppService.processInstallation({
            installationId: installationId.toString(),
            userId,
        })
    }

    const redirectTarget = returnUrl.startsWith('http')
        ? returnUrl
        : `${env.WEB_URL}${returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`}`

    return res.redirect(redirectTarget)
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
        const accountLogin = payload.installation.account?.login
        const accountType = payload.installation.account?.type
        const targetType = payload.installation.target_type
        const permissions = payload.installation.permissions

        let userId = 'system'
        if (accountLogin) {
            const matchedUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { githubUsername: accountLogin },
                        { githubId: payload.installation.account?.id?.toString() },
                    ],
                },
                select: { id: true },
            })
            if (matchedUser) {
                userId = matchedUser.id
            }
        }

        await githubAppService.processInstallation({
            installationId,
            userId,
            accountLogin,
            accountType,
            targetType,
            permissions,
        })
    } else if (event === 'installation' && payload.action === 'deleted') {
        const installationId = payload.installation.id.toString()
        await githubAppService.processUninstallation({ installationId })
    }

    return sendSuccess(res, 'webhook processed successfully', null)
})

const getRepos = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?.id
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const repos = await githubAppService.getUserInstallationRepos({ userId })
    return sendSuccess(res, 'repositories retrieved successfully', repos)
})

const getStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?.id
    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    const status = await githubAppService.getUserInstallationStatus({ userId })
    return sendSuccess(res, 'installation status retrieved successfully', status)
})

export const githubAppController = {
    startInstall,
    handleCallback,
    handleWebhook,
    getRepos,
    getStatus,
}
