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

export async function syncExtractedDirectoryToS3(data: {
    sessionId: string
    sourceDir: string
}): Promise<string[]> {
    const { sessionId, sourceDir } = data
    const bucket = process.env.S3_BUCKET || 'december-storage'
    const uploadedPaths: string[] = []

    const walk = (dir: string, baseDir: string): string[] => {
        let results: string[] = []
        if (!fs.existsSync(dir)) return results
        const list = fs.readdirSync(dir)
        for (const file of list) {
            const fullPath = `${dir}/${file}`
            const stat = fs.statSync(fullPath)
            if (stat && stat.isDirectory()) {
                if (
                    file === 'node_modules' ||
                    file === '.git' ||
                    file === '.next' ||
                    file === 'dist' ||
                    file === 'build'
                ) {
                    continue
                }
                results = results.concat(walk(fullPath, baseDir))
            } else {
                const relativePath = fullPath.substring(baseDir.length + 1)
                results.push(relativePath)
            }
        }
        return results
    }

    const relativeFiles = walk(sourceDir, sourceDir)

    for (const relativePath of relativeFiles) {
        const fullPath = `${sourceDir}/${relativePath}`
        try {
            const content = fs.readFileSync(fullPath)
            const objectKey = `sessions/${sessionId}/workspace/${relativePath}`
            const isJson = relativePath.endsWith('.json')
            const isHtml = relativePath.endsWith('.html')
            const isCss = relativePath.endsWith('.css')
            const isJs =
                relativePath.endsWith('.js') ||
                relativePath.endsWith('.ts') ||
                relativePath.endsWith('.tsx') ||
                relativePath.endsWith('.jsx')

            const contentType = isJson
                ? 'application/json'
                : isHtml
                  ? 'text/html; charset=utf-8'
                  : isCss
                    ? 'text/css; charset=utf-8'
                    : isJs
                      ? 'application/javascript; charset=utf-8'
                      : 'text/plain; charset=utf-8'

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: objectKey,
                    Body: content,
                    ContentType: contentType,
                })
            )
            uploadedPaths.push(relativePath)
        } catch (err) {
            console.error(
                `[Workspace Sync] Failed to upload ${relativePath} to S3 for session ${sessionId}:`,
                err
            )
        }
    }

    return uploadedPaths
}

export async function restoreWorkspaceState(data: {
    sessionId: string
    workspaceDir: string
    objectKey?: string
    sandbox?: any
}): Promise<boolean> {
    const { sessionId, workspaceDir, objectKey, sandbox } = data
    const key = objectKey || `sessions/${sessionId}/workspace.tar.gz`
    const bucket = process.env.S3_BUCKET || 'december-storage'

    try {
        const getCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        })
        const response = await s3.send(getCommand)
        if (!response.Body) return false

        const tempZipPath = `/tmp/restore-${sessionId}-${Date.now()}.tar.gz`
        const buffer = await response.Body.transformToByteArray()
        fs.writeFileSync(tempZipPath, buffer)

        // 1. Restore in remote E2B sandbox via direct presigned S3 download with cURL (avoids ARG_MAX buffer overflows)
        if (sandbox && sandbox.commands && typeof sandbox.commands.run === 'function') {
            try {
                const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 900 })
                await sandbox.commands
                    .run(
                        `curl -sSL "${downloadUrl}" -o /tmp/restore.tar.gz && mkdir -p /workspace && tar -xzf /tmp/restore.tar.gz -C /workspace && rm -f /tmp/restore.tar.gz`,
                        { cwd: '/home/user' }
                    )
                    .catch((e: any) => {
                        console.error(
                            `[Workspace] Remote sandbox restoration warning for session ${sessionId}:`,
                            e
                        )
                    })
            } catch (urlErr) {
                console.error(
                    `[Workspace] Failed to generate presigned download URL for session ${sessionId}:`,
                    urlErr
                )
            }
        }

        // 2. Extract locally and sync uncompressed files to S3 so web file explorer renders immediately
        const tempExtractDir = `/tmp/extracted-${sessionId}-${Date.now()}`
        fs.mkdirSync(tempExtractDir, { recursive: true })

        try {
            execSync(`tar -xzf "${tempZipPath}" -C "${tempExtractDir}"`)

            if (workspaceDir && workspaceDir !== '/workspace') {
                if (!fs.existsSync(workspaceDir)) {
                    fs.mkdirSync(workspaceDir, { recursive: true })
                }
                execSync(`cp -r "${tempExtractDir}"/* "${workspaceDir}"/ 2>/dev/null || true`)
            }

            // Sync uncompressed files to sessions/${sessionId}/workspace/ in S3
            await syncExtractedDirectoryToS3({
                sessionId,
                sourceDir: tempExtractDir,
            }).catch((syncErr) => {
                console.error(
                    `[Workspace] Failed to sync unpacked workspace files to S3 for session ${sessionId}:`,
                    syncErr
                )
            })
        } catch (e) {
            console.error(`[Workspace] Failed to extract archive for session ${sessionId}:`, e)
        } finally {
            if (fs.existsSync(tempExtractDir)) {
                try {
                    fs.rmSync(tempExtractDir, { recursive: true, force: true })
                } catch {
                    // Intentionally swallowed: cleanup fallback
                }
            }
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

export async function syncWorkspaceFilesToS3(data: {
    sessionId: string
    modifiedFiles?: string[]
    workspaceDir?: string
    sandbox?: any
}): Promise<string[]> {
    const { sessionId, modifiedFiles, workspaceDir = '/workspace', sandbox } = data
    const uploadedPaths: string[] = []
    const bucket = process.env.S3_BUCKET || 'december-storage'

    if (modifiedFiles && modifiedFiles.length > 0) {
        for (const rawPath of modifiedFiles) {
            const cleanPath = rawPath.replace(/^\/+/, '').replace(/^workspace\//, '')
            try {
                let content: Buffer | string | null = null

                if (sandbox && sandbox.commands && typeof sandbox.commands.run === 'function') {
                    const catRes = await sandbox.commands
                        .run(`cat "/workspace/${cleanPath}" | base64`, { cwd: '/workspace' })
                        .catch(() => null)
                    if (catRes?.stdout) {
                        content = Buffer.from(catRes.stdout.replace(/\s+/g, ''), 'base64')
                    }
                }

                if (!content && fs.existsSync(`${workspaceDir}/${cleanPath}`)) {
                    content = fs.readFileSync(`${workspaceDir}/${cleanPath}`)
                }

                if (content !== null) {
                    const objectKey = `sessions/${sessionId}/workspace/${cleanPath}`
                    const isJson = cleanPath.endsWith('.json')
                    const isHtml = cleanPath.endsWith('.html')
                    const isCss = cleanPath.endsWith('.css')
                    const isJs =
                        cleanPath.endsWith('.js') ||
                        cleanPath.endsWith('.ts') ||
                        cleanPath.endsWith('.tsx') ||
                        cleanPath.endsWith('.jsx')

                    const contentType = isJson
                        ? 'application/json'
                        : isHtml
                          ? 'text/html; charset=utf-8'
                          : isCss
                            ? 'text/css; charset=utf-8'
                            : isJs
                              ? 'application/javascript; charset=utf-8'
                              : 'text/plain; charset=utf-8'

                    await s3.send(
                        new PutObjectCommand({
                            Bucket: bucket,
                            Key: objectKey,
                            Body: typeof content === 'string' ? Buffer.from(content) : content,
                            ContentType: contentType,
                        })
                    )
                    uploadedPaths.push(cleanPath)
                }
            } catch (err) {
                console.error(
                    `[Workspace Sync] Failed to sync ${cleanPath} to S3 for session ${sessionId}:`,
                    err
                )
            }
        }
    }

    return uploadedPaths
}
