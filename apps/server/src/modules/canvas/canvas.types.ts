import type { CanvasDocument } from './canvas.schema'

export type SessionAccessParam = {
    sessionId?: string
    projectId?: string
    userId: string
}

export type CreateWebClips = {
    url: string
    userId: string
    sessionId?: string
    projectId?: string
}

export type JoinWaitlist = {
    userId: string
}

export type SaveCanvas = {
    sessionId?: string
    projectId?: string
    userId: string
    canvasState: any
}

export type PersistImageAsset = {
    sessionId: string
    userId: string
    item: CanvasDocument['items'][number]
}

export type PersistCanvasDocument = {
    sessionId: string
    userId: string
    canvasState?: CanvasDocument | null
}

export type HydrateCanvasDocument = {
    canvasState?: unknown
    canvasAssetManifest?: unknown
}

export type ClipperWorkerSection = {
    path: string
    width: number
    height: number
}

export type ClipperWorkerResult = {
    directory: string
    full: string
    width: number
    height: number
    sections: ClipperWorkerSection[]
}
