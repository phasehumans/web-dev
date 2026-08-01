import { prisma } from '@december/database'
import { AppError } from '../../shared/appError'
import { runtimeRepository } from './runtime.repository'

import type {
    RuntimePreviewStatus,
    StartPreview,
    PreviewIdentifier,
    NotifyManifestPublished,
    RecordRuntimeStatus,
    CheckSandboxCompilation,
} from './runtime.types'

const previewStatusStore = new Map<string, RuntimePreviewStatus>()
const pendingDeletions = new Map<string, NodeJS.Timeout>()

function cancelPendingDeletion(sessionId: string) {
    const timer = pendingDeletions.get(sessionId)
    if (timer) {
        clearTimeout(timer)
        pendingDeletions.delete(sessionId)
        console.log(`[runtime] Cancelled pending deletion for session ${sessionId}`)
    }
}

function scheduleDeletion(sessionId: string, delayMs: number) {
    cancelPendingDeletion(sessionId)
    const timer = setTimeout(async () => {
        try {
            console.log(`[runtime] Deleting preview status for session ${sessionId}`)
            previewStatusStore.delete(sessionId)
            pendingDeletions.delete(sessionId)
        } catch (err) {
            console.error(`Failed to delete preview status for session ${sessionId}:`, err)
            pendingDeletions.delete(sessionId)
        }
    }, delayMs)
    pendingDeletions.set(sessionId, timer)
}

const loadSession = async (data: StartPreview) => {
    const { userId, projectId: sessionId } = data
    const session = await runtimeRepository.findSessionForStart({ sessionId, userId })
    if (!session) {
        throw new AppError('Session not found', 404)
    }
    return { session }
}

const recordRuntimeStatus = (data: RecordRuntimeStatus) => {
    const { previewId, status } = data
    previewStatusStore.set(previewId, status)
    return status
}

const startPreview = async (data: StartPreview): Promise<RuntimePreviewStatus> => {
    const { userId, projectId: sessionId } = data
    cancelPendingDeletion(sessionId)
    const { session } = await loadSession(data)

    await prisma.session.update({
        where: { id: sessionId },
        data: { vmStatus: 'RUNNING' },
    }).catch(() => {})

    const status: RuntimePreviewStatus = {
        previewId: session.id,
        sessionId: session.id,
        state: 'Healthy',
        backendStatus: 'ready',
        previewUrl: `/api/v1/sessions/${session.id}/preview/5173`,
        updatedAt: new Date().toISOString(),
    }

    previewStatusStore.set(session.id, status)
    return status
}

const notifyManifestPublished = async (data: NotifyManifestPublished): Promise<RuntimePreviewStatus> => {
    const { sessionId } = data
    const status: RuntimePreviewStatus = {
        previewId: sessionId,
        sessionId,
        state: 'Healthy',
        backendStatus: 'ready',
        previewUrl: `/api/v1/sessions/${sessionId}/preview/5173`,
        updatedAt: new Date().toISOString(),
    }
    previewStatusStore.set(sessionId, status)
    return status
}

const getPreviewStatus = async (data: PreviewIdentifier): Promise<RuntimePreviewStatus> => {
    const { userId, previewId } = data
    const session = await runtimeRepository.findSessionForStatus({ previewId, userId })

    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const storedStatus = previewStatusStore.get(previewId)
    if (storedStatus) {
        return storedStatus
    }

    const isRunning = session.vmStatus === 'RUNNING' || session.vmStatus === 'PROVISIONING'
    const status: RuntimePreviewStatus = {
        previewId,
        sessionId: previewId,
        state: isRunning ? 'Healthy' : session.vmStatus === 'FAILED' ? 'Failed' : 'Stopped',
        backendStatus: session.vmStatus === 'RUNNING' ? 'ready' : session.vmStatus === 'PROVISIONING' ? 'loading' : 'failed',
        previewUrl: `/api/v1/sessions/${previewId}/preview/5173`,
        updatedAt: session.updatedAt ? session.updatedAt.toISOString() : new Date().toISOString(),
    }

    return status
}

const deletePreview = async (data: PreviewIdentifier) => {
    const { userId, previewId } = data
    const session = await runtimeRepository.findSessionForDelete({ previewId, userId })

    if (!session) {
        throw new AppError('Session not found', 404)
    }

    previewStatusStore.delete(previewId)
    await prisma.session.update({
        where: { id: previewId },
        data: { vmStatus: 'STOPPED' },
    }).catch(() => {})

    return { deleted: true }
}

export type CompileCheckResult = {
    success: boolean
    errors?: string | null
}

const checkSandboxCompilation = async (data: CheckSandboxCompilation): Promise<CompileCheckResult> => {
    return { success: true, errors: null }
}

export const runtimeService = {
    cancelPendingDeletion,
    scheduleDeletion,
    startPreview,
    notifyManifestPublished,
    getPreviewStatus,
    deletePreview,
    recordRuntimeStatus,
    checkSandboxCompilation,
}
