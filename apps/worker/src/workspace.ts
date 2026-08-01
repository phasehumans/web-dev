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
