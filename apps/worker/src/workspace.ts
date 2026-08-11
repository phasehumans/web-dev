import { execSync } from 'child_process'
import fs from 'fs'

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as archiverModule from 'archiver'

const archiver: any = archiverModule

import './env'

const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
})

export async function compressWorkspace(workspaceDir: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath)
        const archive = archiver('tar', { gzip: true })

        output.on('close', () => resolve())
        archive.on('error', (err: any) => reject(err))

        archive.pipe(output)
        archive.glob('**/*', {
            cwd: workspaceDir,
            ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.git/**'],
            dot: true,
        })
        archive.finalize()
    })
}

export async function uploadWorkspaceToMinio(zipPath: string, objectKey: string): Promise<string> {
    const fileStream = fs.createReadStream(zipPath)
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET || 'december-storage',
            Key: objectKey,
            Body: fileStream,
        })
    )

    const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET || 'december-storage',
        Key: objectKey,
    })

    const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 })
    return signedUrl
}

export async function archiveWorkspaceState(data: {
    sessionId: string
    workspaceDir: string
    sandbox?: any
}): Promise<string> {
    const { sessionId, workspaceDir, sandbox } = data
    const tempZipPath = `/tmp/workspace-${sessionId}-${Date.now()}.tar.gz`
    const objectKey = `sessions/${sessionId}/workspace.tar.gz`

    try {
        if (sandbox && sandbox.commands && typeof sandbox.commands.run === 'function') {
            await sandbox.commands
                .run(
                    'tar -czf /tmp/workspace.tar.gz --exclude="node_modules" --exclude=".next" --exclude="dist" --exclude=".git" -C /workspace .',
                    { cwd: '/workspace' }
                )
                .catch(() => {
                    // Intentionally swallowed: remote tar creation warning fallback
                })

            const catRes = await sandbox.commands
                .run('cat /tmp/workspace.tar.gz | base64', { cwd: '/workspace' })
                .catch(() => null)

            if (catRes?.stdout) {
                const buffer = Buffer.from(catRes.stdout.replace(/\s+/g, ''), 'base64')
                fs.writeFileSync(tempZipPath, buffer)
                await uploadWorkspaceToMinio(tempZipPath, objectKey)
                return objectKey
            }
        }

        if (fs.existsSync(workspaceDir)) {
            await compressWorkspace(workspaceDir, tempZipPath)
            await uploadWorkspaceToMinio(tempZipPath, objectKey)
        }
        return objectKey
    } finally {
        if (fs.existsSync(tempZipPath)) {
            try {
                fs.unlinkSync(tempZipPath)
            } catch {
                // Intentionally swallowed: temp cleanup fallback
            }
        }
    }
}

export async function restoreWorkspaceState(data: {
    sessionId: string
    workspaceDir: string
    objectKey?: string
    sandbox?: any
}): Promise<boolean> {
    const { sessionId, workspaceDir, objectKey, sandbox } = data
    const key = objectKey || `sessions/${sessionId}/workspace.tar.gz`

    try {
        const getCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET || 'december-storage',
            Key: key,
        })
        const response = await s3.send(getCommand)
        if (!response.Body) return false

        const tempZipPath = `/tmp/restore-${sessionId}-${Date.now()}.tar.gz`
        const buffer = await response.Body.transformToByteArray()
        fs.writeFileSync(tempZipPath, buffer)

        if (sandbox && sandbox.commands && typeof sandbox.commands.run === 'function') {
            const base64Str = Buffer.from(buffer).toString('base64')
            await sandbox.commands
                .run(
                    `echo "${base64Str}" | base64 -d > /tmp/restore.tar.gz && mkdir -p /workspace && tar -xzf /tmp/restore.tar.gz -C /workspace && rm -f /tmp/restore.tar.gz`,
                    { cwd: '/workspace' }
                )
                .catch((e: any) => {
                    console.error(
                        `[Workspace] Remote sandbox restoration warning for session ${sessionId}:`,
                        e
                    )
                })
        }

        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true })
        }

        try {
            execSync(`tar -xzf "${tempZipPath}" -C "${workspaceDir}"`)
        } catch (e) {
            console.error(`[Workspace] Failed to extract archive for session ${sessionId}:`, e)
        } finally {
            if (fs.existsSync(tempZipPath)) {
                try {
                    fs.unlinkSync(tempZipPath)
                } catch {
                    // Intentionally swallowed: temp cleanup fallback
                }
            }
        }
        return true
    } catch {
        // Intentionally swallowed: MinIO workspace archive not found or initial clean workspace
        return false
    }
}
