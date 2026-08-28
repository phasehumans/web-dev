import crypto from 'crypto'

import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { createGithubRepoSchema, syncGithubRepoSchema, syncEnvVarsSchema } from './platform.schema'
import { platformService } from './platform.service'
import { vercelService } from './vercel.service'

import type { Request, Response } from 'express'

const downloadProject = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const result = await platformService.downloadSession({
        userId,
        sessionId,
    })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
    return res.status(200).send(Buffer.from(result.zip))
})

const deployVercelProject = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const result = await platformService.deployVercelProject({ userId, sessionId })
    return sendSuccess(res, result.message, {
        deploymentId: result.deploymentId,
        url: result.url,
        readyState: result.readyState,
    })
})

const getVercelDeploymentStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const deploymentId = req.params.deploymentId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!deploymentId) {
        throw new AppError('deployment id is required', 400)
    }

    const result = await vercelService.getDeploymentStatus({ userId, deploymentId })
    return sendSuccess(res, 'deployment status fetched successfully', result)
})

const streamVercelBuildLogs = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const deploymentId = req.params.deploymentId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!deploymentId) {
        throw new AppError('deployment id is required', 400)
    }

    await vercelService.streamBuildLogs({ userId, deploymentId, res })
})

const cancelVercelDeployment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const deploymentId = req.params.deploymentId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!deploymentId) {
        throw new AppError('deployment id is required', 400)
    }

    const result = await vercelService.cancelDeployment({ userId, deploymentId })
    return sendSuccess(res, 'deployment cancelled successfully', result)
})

const getUserGithubRepos = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const search = (req.query.search as string) || undefined

    const result = await platformService.getUserGithubRepos({ userId, page, limit, search })
    return sendSuccess(res, 'repos fetched successfully', result)
})

const createRepo = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const parsedBody = createGithubRepoSchema.parse(req.body)
    const result = await platformService.createRepo({
        userId,
        sessionId,
        ...parsedBody,
    })

    return sendSuccess(res, 'repository created and linked successfully', result)
})

const updateRepo = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const parsedBody = syncGithubRepoSchema.parse(req.body)
    const result = await platformService.updateRepo({
        userId,
        sessionId,
        ...parsedBody,
    })

    return sendSuccess(res, 'repository synced successfully', result)
})

const unlinkGithubRepo = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const result = await platformService.unlinkGithubRepo({ userId, sessionId })
    return sendSuccess(res, result.message, result)
})

const unlinkVercelProject = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const result = await platformService.unlinkVercelProject({ userId, sessionId })
    return sendSuccess(res, result.message, result)
})

const syncEnvironmentVariables = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined
    const sessionId = req.params.sessionId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    if (!sessionId) {
        throw new AppError('session id is required', 400)
    }

    const parsedBody = syncEnvVarsSchema.parse(req.body)

    const result = await platformService.syncEnvironmentVariables({
        userId,
        sessionId,
        keys: parsedBody.keys,
    })
    return sendSuccess(res, result.message, result)
})

const handleVercelWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-vercel-signature'] as string
    if (!signature) {
        throw new AppError('Missing Vercel signature', 401)
    }

    const secret = env.VERCEL_WEBHOOK_SECRET
    if (!secret) {
        console.warn('Vercel webhook received but no secret is configured')
        return res.status(200).send('Webhook received, but processing is disabled')
    }

    const payload = JSON.stringify(req.body)
    const expectedSignature = crypto.createHmac('sha1', secret).update(payload).digest('hex')

    if (signature !== expectedSignature) {
        throw new AppError('Invalid Vercel signature', 401)
    }

    const { type, payload: webhookPayload } = req.body
    if (type === 'deployment.succeeded' || type === 'deployment.error') {
        const deploymentUrl = webhookPayload.deployment.url
        console.log(`Vercel Webhook: Deployment ${deploymentUrl} finished with status ${type}`)
    }

    return res.status(200).send('Webhook processed successfully')
})

export const platformController = {
    downloadProject,
    deployVercelProject,
    getVercelDeploymentStatus,
    streamVercelBuildLogs,
    cancelVercelDeployment,
    getUserGithubRepos,
    createRepo,
    updateRepo,
    unlinkGithubRepo,
    unlinkVercelProject,
    syncEnvironmentVariables,
    handleVercelWebhook,
}
