import { randomUUID } from 'crypto'

import { z } from 'zod'

import {
    sessionAssetKey,
    sessionAssetPrefix,
    deleteObject,
    getBinaryFile,
    putBinaryFile,
} from '../../shared/project-storage'

import { canvasDocumentSchema, canvasAssetKindSchema, type CanvasDocument } from './canvas.schema'

import type { PersistImageAsset, PersistCanvasDocument } from './canvas.types'

type CanvasAssetManifestEntry = {
    itemId: string
    key: string
    contentType?: string
    size: number
    kind: z.infer<typeof canvasAssetKindSchema>
}

const EMPTY_CANVAS_DOCUMENT: CanvasDocument = {
    items: [],
    connections: [],
    pan: { x: 0, y: 0 },
    scale: 100,
    hasInteracted: false,
}

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,(.*)$/s

const contentTypeToExtension = (contentType?: string | null) => {
    switch ((contentType || '').toLowerCase()) {
        case 'image/png':
            return 'png'
        case 'image/jpeg':
            return 'jpg'
        case 'image/webp':
            return 'webp'
        case 'image/gif':
            return 'gif'
        case 'image/svg+xml':
            return 'svg'
        default:
            return 'bin'
    }
}

const parseDataUrl = (value: string) => {
    const match = DATA_URL_PATTERN.exec(value)

    if (!match) {
        return null
    }

    const [, contentType = 'application/octet-stream', isBase64, payload = ''] = match
    const buffer = isBase64
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload))

    return {
        contentType,
        buffer,
    }
}

const toDataUrl = (contentType: string, bytes: Uint8Array) =>
    `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`

const normalizeCanvasDocument = (canvasState?: CanvasDocument | null): CanvasDocument => {
    const parsed = canvasDocumentSchema.safeParse(canvasState)
    return parsed.success ? parsed.data : EMPTY_CANVAS_DOCUMENT
}

const persistImageAsset = async (data: PersistImageAsset) => {
    const { sessionId, userId, item } = data
    const projectAssetPrefix = sessionAssetPrefix(sessionId)
    const preferredKind = item.assetKind ?? 'upload'

    if (
        item.assetKey &&
        item.assetSource === 'project' &&
        item.assetKey.startsWith(projectAssetPrefix)
    ) {
        const existingAsset = await getBinaryFile(item.assetKey)

        if (existingAsset) {
            return {
                key: item.assetKey,
                contentType: item.assetContentType ?? existingAsset.contentType,
                size: existingAsset.body.byteLength,
                kind: preferredKind,
            }
        }
    }

    if (item.assetKey && item.assetSource === 'temporary') {
        const temporaryAsset = await getBinaryFile(item.assetKey)

        if (temporaryAsset) {
            const nextContentType =
                item.assetContentType ?? temporaryAsset.contentType ?? 'image/png'
            const nextKey = sessionAssetKey(
                sessionId,
                `canvas/${preferredKind}/${item.id}-${randomUUID()}.${contentTypeToExtension(nextContentType)}`
            )

            await putBinaryFile({
                key: nextKey,
                content: temporaryAsset.body,
                contentType: nextContentType,
            })
            // Intentionally swallowed: cleanup of temporary asset is non-fatal
            await deleteObject(item.assetKey).catch(() => undefined)

            return {
                key: nextKey,
                contentType: nextContentType,
                size: temporaryAsset.body.byteLength,
                kind: preferredKind,
            }
        }
    }

    if (item.content) {
        const parsedDataUrl = parseDataUrl(item.content)

        if (parsedDataUrl) {
            const nextKey = sessionAssetKey(
                sessionId,
                `canvas/${preferredKind}/${item.id}-${randomUUID()}.${contentTypeToExtension(parsedDataUrl.contentType)}`
            )

            await putBinaryFile({
                key: nextKey,
                content: parsedDataUrl.buffer,
                contentType: parsedDataUrl.contentType,
            })

            return {
                key: nextKey,
                contentType: parsedDataUrl.contentType,
                size: parsedDataUrl.buffer.byteLength,
                kind: preferredKind,
            }
        }
    }

    return null
}

export const persistCanvasDocument = async (data: PersistCanvasDocument) => {
    const { sessionId, userId, canvasState } = data
    const normalizedCanvas = normalizeCanvasDocument(canvasState)
    const assetManifest: CanvasAssetManifestEntry[] = []

    const items = await Promise.all(
        normalizedCanvas.items.map(async (item) => {
            if (item.type !== 'image') {
                return item
            }

            const persistedAsset = await persistImageAsset({
                sessionId,
                userId,
                item,
            })

            if (!persistedAsset) {
                return {
                    ...item,
                    content: undefined,
                    assetKey: undefined,
                    assetSource: undefined,
                    assetContentType: undefined,
                    assetKind: undefined,
                }
            }

            assetManifest.push({
                itemId: item.id,
                key: persistedAsset.key,
                ...(persistedAsset.contentType ? { contentType: persistedAsset.contentType } : {}),
                size: persistedAsset.size,
                kind: persistedAsset.kind,
            })

            return {
                ...item,
                content: undefined,
                assetKey: persistedAsset.key,
                assetSource: 'project' as const,
                assetContentType: persistedAsset.contentType,
                assetKind: persistedAsset.kind,
            }
        })
    )

    return {
        canvasStateJson: {
            ...normalizedCanvas,
            items,
        },
        canvasAssetManifestJson: assetManifest,
    }
}

export const hydrateCanvasDocument = async (
    canvasState: unknown,
    canvasAssetManifest?: unknown
) => {
    const normalizedCanvas = normalizeCanvasDocument(
        canvasState as CanvasDocument | null | undefined
    )
    const parsedAssetManifest = Array.isArray(canvasAssetManifest)
        ? (canvasAssetManifest as CanvasAssetManifestEntry[])
        : []
    const manifestByKey = new Map(parsedAssetManifest.map((asset) => [asset.key, asset]))

    const items = await Promise.all(
        normalizedCanvas.items.map(async (item) => {
            if (item.type !== 'image' || !item.assetKey) {
                return item
            }

            const storedAsset = await getBinaryFile(item.assetKey)

            if (!storedAsset) {
                return item
            }

            const manifestEntry = manifestByKey.get(item.assetKey)
            const contentType =
                item.assetContentType ??
                manifestEntry?.contentType ??
                storedAsset.contentType ??
                'image/png'

            return {
                ...item,
                content: toDataUrl(contentType, storedAsset.body),
                assetSource: 'project' as const,
                assetContentType: contentType,
                assetKind: item.assetKind ?? manifestEntry?.kind ?? 'upload',
            }
        })
    )

    return {
        ...normalizedCanvas,
        items,
    }
}
