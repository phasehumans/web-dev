import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    CopyObjectCommand,
} from '@aws-sdk/client-s3'

import { s3 } from '../config/s3'

const BUCKET = process.env.S3_BUCKET || 'december-storage'

function normalizePath(filePath: string) {
    let normalized = filePath.replace(/\\/g, '/')
    normalized = normalized.replace(/\.\.+\//g, '').replace(/\.\.+$/g, '')
    return normalized.replace(/^\/+/, '').replace(/\/+$/, '')
}

export function currentKey(projectId: string, path: string) {
    return `projects/${projectId}/current-version/${normalizePath(path)}`
}

export function currentPrefix(projectId: string) {
    return `projects/${projectId}/current-version/`
}

export function sessionWorkspaceKey(sessionId: string, path: string) {
    return `sessions/${sessionId}/workspace/${normalizePath(path)}`
}

export function sessionWorkspacePrefix(sessionId: string) {
    return `sessions/${sessionId}/workspace/`
}

export function sessionPrefix(sessionId: string) {
    return `sessions/${sessionId}/`
}

export function versionKey(projectId: string, versionId: string, path: string) {
    return `projects/${projectId}/previous-version/${versionId}/${normalizePath(path)}`
}

export function versionPrefix(projectId: string, versionId: string) {
    return `projects/${projectId}/previous-version/${versionId}/`
}

export function projectPrefix(projectId: string) {
    return `projects/${projectId}/`
}

export function storageBucket() {
    return BUCKET
}

export function assetKey(projectId: string, path: string) {
    return `projects/${projectId}/assets/${normalizePath(path)}`
}

export function assetPrefix(projectId: string) {
    return `projects/${projectId}/assets/`
}

export function sessionAssetKey(sessionId: string, path: string) {
    return `sessions/${sessionId}/assets/${normalizePath(path)}`
}

export function sessionAssetPrefix(sessionId: string) {
    return `sessions/${sessionId}/assets/`
}

export async function putTextFile({
    key,
    content,
    contentType = 'text/plain; charset=utf-8',
}: {
    key: string
    content: string
    contentType?: string
}) {
    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: content,
            ContentLength: Buffer.byteLength(content, 'utf8'),
            ContentType: contentType,
        })
    )
}

export async function getTextFile(key: string) {
    try {
        const result = await s3.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: key,
            })
        )

        return await result.Body?.transformToString()
    } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ''

        if (message.includes('nosuchkey') || message.includes('not found')) {
            return null
        }

        throw error
    }
}

export async function putBinaryFile({
    key,
    content,
    contentType,
}: {
    key: string
    content: Uint8Array | Buffer
    contentType?: string
}) {
    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: content,
            ContentLength: content.byteLength ?? content.length,
            ...(contentType ? { ContentType: contentType } : {}),
        })
    )
}

export async function getBinaryFile(key: string) {
    try {
        const result = await s3.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: key,
            })
        )

        const body = await result.Body?.transformToByteArray()

        if (!body) {
            return null
        }

        return {
            body,
            contentType: result.ContentType,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : ''

        if (message.includes('nosuchkey') || message.includes('not found')) {
            return null
        }

        throw error
    }
}

export async function deleteObject(key: string) {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    )
}

export async function listPrefix(prefix: string) {
    const objects: any[] = []
    let continuationToken: string | undefined

    do {
        const result = await s3.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            })
        )

        if (result.Contents) {
            objects.push(...result.Contents)
        }

        continuationToken = result.NextContinuationToken
    } while (continuationToken)

    return objects
}

export async function deletePrefix(prefix: string) {
    const objects = await listPrefix(prefix)
    const keys = objects.map((object) => object.Key).filter((key): key is string => Boolean(key))

    if (keys.length === 0) {
        return
    }

    const chunkSize = 1000
    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize)
        await s3.send(
            new DeleteObjectsCommand({
                Bucket: BUCKET,
                Delete: {
                    Objects: chunk.map((key) => ({ Key: key })),
                    Quiet: true,
                },
            })
        )
    }
}

export async function copyObject({
    sourceKey,
    destinationKey,
}: {
    sourceKey: string
    destinationKey: string
}) {
    await s3.send(
        new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${sourceKey}`,
            Key: destinationKey,
        })
    )
}
