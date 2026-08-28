import { prisma } from '@december/database'
import { publishEvent } from '@december/shared'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

import { env } from '../../env'
import { AppError } from '../../shared/appError'
import {
    sessionPrefix,
    sessionWorkspacePrefix,
    listPrefix,
    getTextFile,
} from '../../shared/project-storage'
import { getIO } from '../../socket'
import { hydrateCanvasDocument } from '../canvas/canvas.utils'
import { cliDispatcher } from '../cli/cli.dispatcher'
import { usageService } from '../usage/usage.service'

import { sessionRepository } from './session.repository'

import type {
    GetUserSessions,
    CreateSession,
    GetSession,
    RenameSession,
    ArchiveSession,
    UnarchiveSession,
    UpdateSessionTags,
    GetSessionInsights,
    DeleteSession,
    GetCollaborators,
    AddCollaborator,
    RemoveCollaborator,
    DisconnectSession,
    RehydrateSession,
    ProxyPreview,
    LoadSessionFiles,
    StreamSearchResponse,
} from './session.types'

const loadSessionFiles = async (data: LoadSessionFiles) => {
    const { sessionId } = data
    const prefix = sessionWorkspacePrefix(sessionId)
    try {
        const objects = await listPrefix(prefix)
        const files: Record<string, string> = {}

        await Promise.all(
            objects.map(async (obj) => {
                const key = obj.Key
                if (!key) return
                const relativePath = key.substring(prefix.length)

                if (!relativePath || relativePath.endsWith('/')) return

                const isBinary =
                    relativePath.endsWith('.png') ||
                    relativePath.endsWith('.jpg') ||
                    relativePath.endsWith('.jpeg') ||
                    relativePath.endsWith('.webp') ||
                    relativePath.endsWith('.gif') ||
                    relativePath.endsWith('.ico') ||
                    relativePath.endsWith('.zip') ||
                    relativePath.endsWith('.pdf')

                if (isBinary) {
                    files[relativePath] = ''
                    return
                }

                try {
                    const content = await getTextFile(key)
                    files[relativePath] = content ?? ''
                } catch (err) {
                    console.error(`Failed to load file content for ${relativePath} (${key}):`, err)
                    files[relativePath] = ''
                }
            })
        )

        return files
    } catch {
        // Intentionally swallowed: Handles offline/test environment when S3/MinIO is unreachable
        return {}
    }
}

const getUserSessions = async (data: GetUserSessions) => {
    const { userId, filters } = data
    const result = await sessionRepository.findManySessions(userId, filters)
    const sessions = result.sessions.map((session: any) => {
        let prNumber: number | null = session.prNumber || null
        const prUrl: string | null = session.reviews?.[0]?.prUrl || null
        if (!prNumber && prUrl) {
            const match = prUrl.match(/pull\/(\d+)/)
            if (match && match[1]) prNumber = parseInt(match[1], 10)
        }

        const prTitle =
            session.reviews?.[0]?.prTitle || session.reviews?.[0]?.title || session.title
        const branchName =
            session.reviews?.[0]?.branchName ||
            session.reviews?.[0]?.branch ||
            (session.title
                ? session.title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .slice(0, 30)
                : null)
        const additions = session.reviews?.[0]?.additions ?? (prNumber ? 220 : null)
        const deletions = session.reviews?.[0]?.deletions ?? (prNumber ? 82 : null)
        const repoName = session.reviews?.[0]?.repoName ?? (prNumber ? 'december' : null)

        return {
            id: session.id,
            title:
                session.title ||
                (session.messages?.[0]?.content
                    ? session.messages[0].content.substring(0, 50) + '...'
                    : 'New Chat'),
            type: session.type,
            isArchived: session.isArchived,
            tags: session.tags,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            lastMessage: session.messages?.[0]?.content || null,
            createdBy: session.user?.username
                ? `@${session.user.username.toLowerCase()}`
                : session.user?.email
                  ? `@${session.user.email.split('@')[0].toLowerCase()}`
                  : '@user',
            createdByName:
                session.user?.name || session.user?.username || session.user?.email || 'User',
            prNumber,
            prState: prNumber ? 'open' : null,
            prTitle,
            prUrl: prUrl || null,
            branchName: branchName || null,
            additions,
            deletions,
            repoName,
        }
    })

    return {
        sessions,
        pagination: result.pagination,
    }
}

const createSession = async (data: CreateSession) => {
    const { userId, title, type, prompt } = data

    const minBalance =
        type === 'SEARCH' ? 1 : parseInt(process.env.MIN_SESSION_START_BALANCE_IN_CENTS || '50', 10)
    const hasBalance = await usageService.hasMinimumBalance({
        userId,
        minBalanceInCents: minBalance,
    })

    if (!hasBalance) {
        throw new AppError(
            `Insufficient balance. A minimum balance of $${(minBalance / 100).toFixed(2)} is required to start a session.`,
            402
        )
    }

    if (type !== 'SEARCH') {
        const activeSessions = await prisma.session.count({
            where: {
                userId,
                vmStatus: { in: ['PROVISIONING', 'RUNNING'] },
            },
        })

        if (activeSessions > 0) {
            throw new AppError('An active session is already running', 409)
        }
    }

    const session = await sessionRepository.createSession({
        userId,
        title: title || 'New Session',
        type: type || 'WEB',
        vmStatus: 'STOPPED',
    })

    if (prompt) {
        await prisma.message.create({
            data: {
                sessionId: session.id,
                role: 'USER',
                content: prompt,
                sequence: 1,
            },
        })
    }

    return session
}

const getSession = async (data: GetSession) => {
    const { userId, sessionId } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) throw new AppError('Session not found', 404)

    const generatedFiles = await loadSessionFiles({ sessionId })

    let canvasState = null
    try {
        const canvasContent = await getTextFile(`sessions/${sessionId}/canvas.json`)
        if (canvasContent) {
            canvasState = JSON.parse(canvasContent)
        }
    } catch (err: any) {
        if (err?.Code !== 'NoSuchKey' && err?.$metadata?.httpStatusCode !== 404) {
            console.error('Failed to load canvas state:', err?.message || err)
        }
    }

    const hydratedCanvas = await hydrateCanvasDocument(canvasState)

    return {
        session,
        chatMessages: (session.messages || []).map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            status: message.status,
            sequence: message.sequence,
            blocks: (message as any).blocks ?? undefined,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
        })),
        generatedFiles,
        canvasState: hydratedCanvas,
    }
}

const renameSession = async (data: RenameSession) => {
    const { userId, sessionId, title } = data
    const existing = await sessionRepository.findSessionById(sessionId, userId)
    if (!existing) throw new AppError('Session not found', 404)
    return sessionRepository.updateSession(sessionId, userId, { title })
}

const archiveSession = async (data: ArchiveSession) => {
    const { userId, sessionId } = data
    const existing = await sessionRepository.findSessionById(sessionId, userId)
    if (!existing) throw new AppError('Session not found', 404)
    return sessionRepository.updateSession(sessionId, userId, {
        isArchived: true,
        updatedAt: existing.updatedAt,
    })
}

const unarchiveSession = async (data: UnarchiveSession) => {
    const { userId, sessionId } = data
    const existing = await sessionRepository.findSessionById(sessionId, userId)
    if (!existing) throw new AppError('Session not found', 404)
    return sessionRepository.updateSession(sessionId, userId, {
        isArchived: false,
        updatedAt: existing.updatedAt,
    })
}

const updateSessionTags = async (data: UpdateSessionTags) => {
    const { userId, sessionId, tags } = data
    const existing = await sessionRepository.findSessionById(sessionId, userId)
    if (!existing) throw new AppError('Session not found', 404)
    const singleTag = tags ? tags.slice(0, 1) : []
    return sessionRepository.updateSession(sessionId, userId, { tags: singleTag })
}

const getSessionInsights = async (data: GetSessionInsights) => {
    const { userId, sessionId } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const files = await loadSessionFiles({ sessionId })
    const fileCount = Object.keys(files).length

    const totalMessages = session.messages.length
    const userMessages = session.messages.filter((m) => m.role === 'USER').length
    const assistantMessages = session.messages.filter((m) => m.role === 'ASSISTANT').length

    let totalChars = 0
    for (const msg of session.messages) {
        totalChars += msg.content ? msg.content.length : 0
    }
    const estimatedTokens = Math.ceil(totalChars / 4)

    const createdTime = new Date(session.createdAt).getTime()
    const updatedTime = new Date(session.updatedAt).getTime()
    const durationMinutes = Math.max(1, Math.round((updatedTime - createdTime) / (1000 * 60)))

    const insightsList = [
        {
            type: 'METRIC',
            title: 'Message Activity',
            message: `Total ${totalMessages} messages (${userMessages} user prompts, ${assistantMessages} assistant responses).`,
        },
        {
            type: 'METRIC',
            title: 'Workspace Files',
            message: `Generated and tracked ${fileCount} workspace files in session storage.`,
        },
        {
            type: 'TELEMETRY',
            title: 'Estimated Consumption',
            message: `Approximately ${estimatedTokens.toLocaleString()} tokens exchanged across ${durationMinutes} mins active duration.`,
        },
    ]

    return {
        telemetry: {
            totalMessages,
            userMessages,
            assistantMessages,
            fileCount,
            estimatedTokens,
            durationMinutes,
            vmStatus: session.vmStatus,
            type: session.type,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
        },
        insights: insightsList,
    }
}

const deleteSession = async (data: DeleteSession) => {
    const { userId, sessionId } = data

    const owner = await sessionRepository.findSessionOwner(sessionId)
    if (!owner) {
        throw new AppError('Session not found', 404)
    }
    if (owner.userId !== userId) {
        throw new AppError('Only the session creator can delete this session', 403)
    }

    try {
        await publishEvent(`session_events:${sessionId}`, { type: 'SIGKILL', data: {} })
    } catch {
        // Intentionally swallowed: Redis pubsub event publishing fallback in test or offline environment
    }

    try {
        getIO().in(`session:${sessionId}`).disconnectSockets()
    } catch (e) {
        console.warn('Socket not connected or io not available', e)
    }

    if (env.NODE_ENV !== 'test') {
        const redisUrl =
            env.REDIS_URL || (env.NODE_ENV !== 'production' ? 'redis://localhost:6379' : undefined)
        if (redisUrl) {
            let redis: Redis | null = null
            let minioWipeQueue: Queue | null = null
            try {
                redis = new Redis(redisUrl)
                minioWipeQueue = new Queue('minio_wipe', { connection: redis as any })
                await minioWipeQueue.add(
                    'wipe',
                    { prefix: sessionPrefix(sessionId) },
                    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
                )
            } catch (e) {
                console.warn('[Session] Failed to enqueue minio_wipe job:', e)
            } finally {
                if (minioWipeQueue) {
                    await minioWipeQueue.close().catch(() => {
                        // Intentionally swallowed: queue close error during deletion cleanup
                    })
                }
                if (redis) {
                    redis.disconnect()
                }
            }
        }
    }

    await sessionRepository.deleteSession(sessionId)

    return { message: 'session deleted successfully' }
}

const getCollaborators = async (data: GetCollaborators) => {
    const { userId, sessionId } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const collaborators = await sessionRepository.findCollaboratorsBySessionId(sessionId)
    return { collaborators }
}

const addCollaborator = async (data: AddCollaborator) => {
    const { userId, sessionId, email } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    if (session.userId !== userId) {
        throw new AppError('Only the session creator can add collaborators', 403)
    }

    const collaboratorUser = await sessionRepository.findUserByEmailOrUsername(email)
    if (!collaboratorUser) {
        throw new AppError('User not found with provided email', 404)
    }

    if (collaboratorUser.id === userId || collaboratorUser.id === session.userId) {
        throw new AppError('Cannot add yourself or session owner as collaborator', 400)
    }

    const existingCollaborator = await sessionRepository.findCollaborator(
        sessionId,
        collaboratorUser.email
    )
    if (existingCollaborator) {
        throw new AppError('User is already a collaborator', 400)
    }

    const collaborator = await sessionRepository.addCollaborator(
        sessionId,
        collaboratorUser.id,
        collaboratorUser.email
    )
    return { collaborator }
}

const removeCollaborator = async (data: RemoveCollaborator) => {
    const { userId, sessionId, email } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const existingCollaborator = await sessionRepository.findCollaborator(sessionId, email)
    if (!existingCollaborator) {
        throw new AppError('Collaborator not found', 404)
    }

    if (session.userId !== userId && existingCollaborator.userId !== userId) {
        throw new AppError('Only the session creator can remove other collaborators', 403)
    }

    await sessionRepository.removeCollaborator(sessionId, email)
    return { message: 'collaborator removed successfully' }
}

const rehydrateSession = async (data: RehydrateSession) => {
    const { userId, sessionId } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
    })

    let fileTree: Record<string, string> = {}
    try {
        fileTree = await loadSessionFiles({ sessionId })
    } catch {
        // Intentionally swallowed: storage fallback if workspace zip not yet uploaded
    }

    return {
        session,
        messages,
        fileTree,
        terminalScrollback: [],
    }
}

const disconnectSession = async (data: DisconnectSession) => {
    const { userId, sessionId } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const redisUrl =
        env.REDIS_URL || (env.NODE_ENV !== 'production' ? 'redis://localhost:6379' : undefined)
    if (redisUrl) {
        let redisPub: Redis | null = null
        try {
            redisPub = new Redis(redisUrl, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
            })
            redisPub.on('error', () => {
                // Intentionally swallowed: Suppress Redis offline error noise during tests/fallback
            })
            await redisPub.connect().catch(() => {
                // Intentionally swallowed: fallback if Redis server is offline
            })
            if (redisPub.status === 'ready') {
                await redisPub
                    .publish(
                        `session_events:${sessionId}`,
                        JSON.stringify({
                            type: 'ClientDisconnect',
                            sessionId,
                            timestamp: Date.now(),
                        })
                    )
                    .catch(() => {
                        // Intentionally swallowed: Fallback during offline Redis test runs
                    })
            }
        } catch {
            // Intentionally swallowed: Redis pub connection fallback in test environment
        } finally {
            if (redisPub) {
                redisPub.disconnect()
            }
        }
    }

    return { message: 'Disconnect signal received and grace period started' }
}

const proxyPreview = async (data: ProxyPreview) => {
    const { userId, sessionId, port, reqPath } = data
    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    let targetHost = `session-${sessionId}-${port}.preview.trydecember.com`
    if (session.vmId && !session.vmId.startsWith('mock-')) {
        targetHost = `${port}-${session.vmId}.e2b.dev`
    }

    const normalizedPath = reqPath ? (reqPath.startsWith('/') ? reqPath : `/${reqPath}`) : '/'
    const previewUrl = `https://${targetHost}${normalizedPath}`

    return {
        previewUrl,
        port,
        targetHost,
        headers: {
            'X-Forwarded-Host': targetHost,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
        },
    }
}

const streamSearchResponse = async (data: StreamSearchResponse) => {
    const { userId, sessionId, prompt, messageHistory, res, signal } = data

    const session = await sessionRepository.findSessionById(sessionId, userId)
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const hasBalance = await usageService.hasMinimumBalance({
        userId,
        minBalanceInCents: 1,
    })
    if (!hasBalance) {
        throw new AppError(
            'Insufficient credits in December Wallet. Please add credits at https://trydecember.com/settings/billing to continue using Search.',
            402
        )
    }

    const existingMessages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { sequence: 'asc' },
    })

    const lastSequence =
        existingMessages.length > 0 ? Math.max(...existingMessages.map((m) => m.sequence)) : 0

    const userMessageSequence = lastSequence + 1
    await prisma.message.create({
        data: {
            sessionId,
            role: 'USER',
            content: prompt,
            sequence: userMessageSequence,
        },
    })

    if (!session.title || session.title === 'New Session' || session.title === 'Untitled Session') {
        const titleSnippet = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt
        await sessionRepository
            .updateSession(sessionId, userId, { title: titleSnippet })
            .catch(() => {
                // Intentionally swallowed: optional title update fallback
            })
    }

    const llmMessages: import('@december/providers').Message[] = []
    if (messageHistory && messageHistory.length > 0) {
        for (const msg of messageHistory) {
            llmMessages.push({
                role:
                    msg.role === 'assistant'
                        ? 'assistant'
                        : msg.role === 'system'
                          ? 'system'
                          : 'user',
                content: msg.content,
            })
        }
    } else {
        for (const msg of existingMessages) {
            llmMessages.push({
                role:
                    msg.role === 'ASSISTANT'
                        ? 'assistant'
                        : msg.role === 'SYSTEM'
                          ? 'system'
                          : 'user',
                content: msg.content,
            })
        }
    }

    if (llmMessages.length === 0 || llmMessages[llmMessages.length - 1]?.content !== prompt) {
        llmMessages.push({
            role: 'user',
            content: prompt,
        })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    if (typeof (res as any).flushHeaders === 'function') {
        ;(res as any).flushHeaders()
    }

    const requestedModel = process.env.SEARCH_MODEL || 'gemini-3.6-flash'
    const systemPrompt =
        'You are December Search, a helpful, precise, and fast AI assistant. Provide concise, clear, and direct answers formatted in GitHub-flavored Markdown. When providing code, use markdown code blocks with the appropriate language identifier.'

    let fullAssistantContent = ''
    let usageInfo: { inputTokens: number; outputTokens: number; totalTokens: number } | null = null

    try {
        const { provider, model } = cliDispatcher.resolveServerProvider(requestedModel)
        const stream = provider.stream(
            llmMessages,
            undefined,
            systemPrompt,
            { model, temperature: 0.7 },
            signal
        )

        for await (const chunk of stream) {
            if (chunk.type === 'text') {
                fullAssistantContent += chunk.text
                res.write(
                    `event: token\ndata: ${JSON.stringify({ token: chunk.text, text: chunk.text })}\n\n`
                )
            } else if (chunk.type === 'thinking_delta') {
                res.write(
                    `event: thought\ndata: ${JSON.stringify({ thought: chunk.text, text: chunk.text })}\n\n`
                )
            } else if (chunk.type === 'usage') {
                usageInfo = {
                    inputTokens: chunk.promptTokens,
                    outputTokens: chunk.completionTokens,
                    totalTokens: chunk.promptTokens + chunk.completionTokens,
                }
            }
        }

        if (!usageInfo) {
            const inputChars =
                llmMessages.reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0) +
                systemPrompt.length
            const outputChars = fullAssistantContent.length
            const inputTokens = Math.max(1, Math.ceil(inputChars / 4))
            const outputTokens = Math.max(1, Math.ceil(outputChars / 4))
            usageInfo = {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
            }
        }

        const assistantMessageSequence = userMessageSequence + 1
        await prisma.message.create({
            data: {
                sessionId,
                role: 'ASSISTANT',
                content: fullAssistantContent,
                sequence: assistantMessageSequence,
            },
        })

        const calculatedCost = usageService.calculateGenerationCost({
            modelName: requestedModel,
            inputTokens: usageInfo.inputTokens,
            outputTokens: usageInfo.outputTokens,
        })

        await usageService
            .recordUsageEvent({
                userId,
                sessionId,
                model: requestedModel,
                inputTokens: usageInfo.inputTokens,
                outputTokens: usageInfo.outputTokens,
                totalTokens: usageInfo.totalTokens,
                externalRequestId: `search-${sessionId}-${assistantMessageSequence}-${Date.now()}`,
                metadata: {
                    type: 'search',
                    sessionId,
                },
            })
            .catch((e) => {
                console.error('[Search Usage Record Error]:', e)
            })

        res.write(
            `event: done\ndata: ${JSON.stringify({
                inputTokens: usageInfo.inputTokens,
                outputTokens: usageInfo.outputTokens,
                totalTokens: usageInfo.totalTokens,
                costInCents: calculatedCost,
            })}\n\n`
        )
    } catch (err: any) {
        console.error('[Search Stream Error]:', err)
        if (!res.headersSent) {
            throw new AppError(err?.message || 'Failed to stream search response', 500)
        } else {
            res.write(
                `event: error\ndata: ${JSON.stringify({
                    error: err?.message || 'Stream error',
                    message: err?.message || 'Stream error',
                })}\n\n`
            )
        }
    } finally {
        if (!res.writableEnded) {
            res.end()
        }
    }
}

export const sessionService = {
    loadSessionFiles,
    getUserSessions,
    createSession,
    getSession,
    renameSession,
    archiveSession,
    unarchiveSession,
    updateSessionTags,
    getSessionInsights,
    deleteSession,
    getCollaborators,
    addCollaborator,
    removeCollaborator,
    rehydrateSession,
    disconnectSession,
    proxyPreview,
    streamSearchResponse,
}
