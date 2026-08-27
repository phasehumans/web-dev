import { AppError } from '../../shared/appError'
import { putTextFile } from '../../shared/project-storage'

import { canvasRepository } from './canvas.repository'
import { persistCanvasDocument } from './canvas.utils'

import type { SaveCanvas, CreateWebClips, SessionAccessParam, JoinWaitlist } from './canvas.types'

const assertSessionAccess = async (data: SessionAccessParam) => {
    const { sessionId, projectId, userId } = data
    const access = await canvasRepository.findSessionAccess({ sessionId, projectId, userId })
    if (!access) {
        throw new AppError('session not found or access denied', 403)
    }
    return access
}

const createWebClips = async (data: CreateWebClips) => {
    const { url, userId, sessionId, projectId } = data
    if (sessionId || projectId) {
        await assertSessionAccess({ sessionId, projectId, userId })
    }

    return {
        sourceUrl: url,
        clips: [],
    }
}

const saveCanvas = async (data: SaveCanvas) => {
    const { sessionId, projectId, userId, canvasState } = data
    const access = await assertSessionAccess({ sessionId, projectId, userId })
    const targetSessionId = access.id

    const persistedCanvas = await persistCanvasDocument({
        sessionId: targetSessionId,
        userId,
        canvasState,
    })

    // save canvas state directly to s3
    await putTextFile({
        key: `sessions/${targetSessionId}/canvas.json`,
        content: JSON.stringify(persistedCanvas.canvasStateJson),
        contentType: 'application/json',
    })

    await putTextFile({
        key: `sessions/${targetSessionId}/canvas-manifest.json`,
        content: JSON.stringify(persistedCanvas.canvasAssetManifestJson),
        contentType: 'application/json',
    })

    return {
        success: true,
        canvasState: persistedCanvas.canvasStateJson,
    }
}

const joinWaitlist = async (data: JoinWaitlist) => {
    const { userId } = data
    const user = await canvasRepository.updateCanvasWaitlist({ userId })
    return {
        canvasWaitlist: user.canvasWaitlist,
    }
}

export const canvasService = {
    createWebClips,
    saveCanvas,
    joinWaitlist,
}
