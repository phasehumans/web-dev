import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

import { env } from '../env'

const S3_BUCKET = env.S3_BUCKET

export const s3 = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
    },
})

export async function ensureStorageBucket() {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }))
        console.log(`[s3] bucket "${S3_BUCKET}" exists`)
    } catch (err: any) {
        const statusCode = err.$metadata?.httpStatusCode
        if (err.name === 'NotFound' || statusCode === 404) {
            console.log(`[s3] bucket "${S3_BUCKET}" not found, creating...`)
            try {
                await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }))
                console.log(`[s3] bucket "${S3_BUCKET}" created`)
            } catch (createErr: any) {
                if (
                    createErr.name === 'BucketAlreadyOwnedByYou' ||
                    createErr.name === 'BucketAlreadyExists'
                ) {
                    console.log(`[s3] bucket "${S3_BUCKET}" already exists`)
                } else {
                    console.warn(
                        `[s3] warning: failed to create bucket "${S3_BUCKET}": ${createErr?.message || createErr}`
                    )
                }
            }
        } else if (err.name === 'Forbidden' || statusCode === 403) {
            console.warn(
                `[s3] warning: head bucket returned 403 Forbidden for "${S3_BUCKET}". Proceeding assuming bucket exists.`
            )
        } else {
            console.warn(
                `[s3] warning: failed to verify bucket "${S3_BUCKET}": ${err?.message || err}. Proceeding with startup.`
            )
        }
    }
}
