import type { CanvasAssetKind, CanvasAssetSource } from '@/features/canvas/types'

import { apiRequest } from '@/shared/api/client'

export interface WebClipResult {
    id: string
    content: string
    width: number
    height: number
    assetKey: string
    assetSource: CanvasAssetSource
    assetContentType: string
    assetKind: CanvasAssetKind
}

export interface CreateWebClipsResponse {
    sourceUrl: string
    clips: WebClipResult[]
}

const createWebClips = (data: { url: string; projectId?: string | null }) => {
    return apiRequest<CreateWebClipsResponse>('/canvas/web-clips', {
        method: 'POST',
        body: JSON.stringify({
            url: data.url,
            ...(data.projectId ? { projectId: data.projectId } : {}),
        }),
    })
}

const saveCanvas = (data: { projectId: string; versionId?: string | null; canvasState: any }) => {
    return apiRequest<{ success: boolean; canvasState: any }>('/canvas/save', {
        method: 'POST',
        body: JSON.stringify({
            projectId: data.projectId,
            ...(data.versionId ? { versionId: data.versionId } : {}),
            canvasState: data.canvasState,
        }),
    })
}

const joinWaitlist = () => {
    return apiRequest<{ canvasWaitlist: boolean }>('/canvas/waitlist', {
        method: 'POST',
    })
}

export const canvasAPI = {
    createWebClips,
    saveCanvas,
    joinWaitlist,
}
