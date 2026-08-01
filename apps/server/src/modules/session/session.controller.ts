import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import {
    getSessionsSchema,
    createSessionSchema,
    getSessionByIdSchema,
    renameSessionParamsSchema,
    renameSessionBodySchema,
    archiveSessionParamsSchema,
    unarchiveSessionParamsSchema,
    updateSessionTagsParamsSchema,
    updateSessionTagsBodySchema,
    getSessionInsightsParamsSchema,
    deleteSessionParamsSchema,
    getCollaboratorsParamsSchema,
    addCollaboratorParamsSchema,
    addCollaboratorBodySchema,
    removeCollaboratorParamsSchema,
    disconnectSessionParamsSchema,
    rehydrateSessionParamsSchema,
    proxyPreviewParamsSchema,
} from './session.schema'
import { sessionService } from './session.service'

import type { Request, Response } from 'express'

export const getSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const parsedQuery = getSessionsSchema.parse(req.query)

    const filters: import('./session.types').SessionFilters = {}
    if (parsedQuery.type) filters.type = parsedQuery.type
    if (parsedQuery.isArchived !== undefined) filters.isArchived = parsedQuery.isArchived
    if (parsedQuery.tags) {
        filters.tags = parsedQuery.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
    }
    if (parsedQuery.sortBy) filters.sortBy = parsedQuery.sortBy
    if (parsedQuery.sortOrder) filters.sortOrder = parsedQuery.sortOrder
    if (parsedQuery.search) filters.search = parsedQuery.search
    if (parsedQuery.page) filters.page = parsedQuery.page
    if (parsedQuery.limit) filters.limit = parsedQuery.limit

    const result = await sessionService.getUserSessions({ userId, filters })
    return sendSuccess(res, 'sessions fetched successfully', {
        sessions: result.sessions,
        pagination: result.pagination,
    })
})

export const createSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const parsedBody = createSessionSchema.parse(req.body)
    const { title, projectId, type, prompt } = parsedBody

    const session = await sessionService.createSession({
        userId,
        title,
        projectId,
        type,
        prompt,
    })
    return sendSuccess(res, 'session created successfully', { session }, 201)
})

export const getSessionById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = getSessionByIdSchema.parse(req.params)

    const result = await sessionService.getSession({ userId, sessionId: id })
    return sendSuccess(res, 'session fetched successfully', result)
})

export const renameSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = renameSessionParamsSchema.parse(req.params)
    const { title } = renameSessionBodySchema.parse(req.body)

    const session = await sessionService.renameSession({
        userId,
        sessionId: id,
        title,
    })
    return sendSuccess(res, 'session renamed successfully', { session })
})

export const archiveSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = archiveSessionParamsSchema.parse(req.params)

    const session = await sessionService.archiveSession({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, 'session archived successfully', { session })
})

export const unarchiveSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = unarchiveSessionParamsSchema.parse(req.params)

    const session = await sessionService.unarchiveSession({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, 'session unarchived successfully', { session })
})

export const updateSessionTags = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = updateSessionTagsParamsSchema.parse(req.params)
    const { tags } = updateSessionTagsBodySchema.parse(req.body)

    const session = await sessionService.updateSessionTags({
        userId,
        sessionId: id,
        tags,
    })
    return sendSuccess(res, 'session tags updated successfully', { session })
})

export const getSessionInsights = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = getSessionInsightsParamsSchema.parse(req.params)

    const result = await sessionService.getSessionInsights({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, 'session insights fetched successfully', result)
})

export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = deleteSessionParamsSchema.parse(req.params)

    const result = await sessionService.deleteSession({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, result.message, result)
})

export const getCollaborators = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = getCollaboratorsParamsSchema.parse(req.params)

    const collaborators = await sessionService.getCollaborators({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, 'collaborators fetched successfully', collaborators)
})

export const addCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = addCollaboratorParamsSchema.parse(req.params)
    const { email } = addCollaboratorBodySchema.parse(req.body)

    const collaborator = await sessionService.addCollaborator({
        userId,
        sessionId: id,
        email,
    })
    return sendSuccess(res, 'collaborator added successfully', collaborator)
})

export const removeCollaborator = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id, email } = removeCollaboratorParamsSchema.parse(req.params)

    const result = await sessionService.removeCollaborator({
        userId,
        sessionId: id,
        email,
    })
    return sendSuccess(res, result.message, result)
})

export const rehydrateSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = rehydrateSessionParamsSchema.parse(req.params)

    const result = await sessionService.rehydrateSession({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, 'session rehydrated successfully', result)
})

export const disconnectSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id } = disconnectSessionParamsSchema.parse(req.params)

    const result = await sessionService.disconnectSession({
        userId,
        sessionId: id,
    })
    return sendSuccess(res, result.message, result)
})

export const proxyPreview = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { id, port } = proxyPreviewParamsSchema.parse(req.params)

    const result = await sessionService.proxyPreview({
        userId,
        sessionId: id,
        port,
        reqPath: req.path,
    })

    res.set(result.headers)

    if (req.headers.accept?.includes('application/json')) {
        return sendSuccess(res, 'web preview proxy target resolved', result)
    }

    if (process.env.E2B_API_KEY && result.previewUrl.startsWith('http')) {
        return res.redirect(302, result.previewUrl)
    }

    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Preview Port ${port}</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
                .badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; display: inline-block; margin-bottom: 1rem; }
                code { background: #0f172a; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">E2B Cloud Sandbox</span>
                <h2>Dev Server Active on Port ${port}</h2>
                <p>Proxy target domain: <code>${result.targetHost}</code></p>
                <p>Live sandbox web application container listening for active connections.</p>
            </div>
        </body>
        </html>
    `)
})
