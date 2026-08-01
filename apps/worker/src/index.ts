import './env'
import { prisma } from '@december/database'
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'

import { E2BSandboxService } from './e2b-sandbox.service'
import { processGrpcStream } from './listener'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const redisConnection: any = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
})

console.log("Worker started, waiting for jobs on 'agent_jobs'...")

export const worker = new Worker(
    'agent_jobs',
    async (job: Job) => {
        const { sessionId, userId } = job.data
        console.log(`Processing job ${job.id} for session ${sessionId}`)

        try {
            await prisma.session.update({
                where: { id: sessionId },
                data: { vmStatus: 'PROVISIONING' },
            })

            // generate short-lived jwt
            const token = jwt.sign(
                { userId, sessionId },
                process.env.AGENT_TOKEN_SECRET || 'secret',
                { expiresIn: '15m' }
            )

            // Provision E2B microVM sandbox with 3x retry backoff
            console.log(`Provisioning E2B Sandbox for session ${sessionId}...`)
            const provisionResult = await E2BSandboxService.provisionSandbox({ sessionId })
            console.log(
                `E2B Sandbox provisioned successfully (${provisionResult.sandboxId}). Establishing agent session...`
            )

            const apiHostUrl = process.env.API_URL || 'http://localhost:4000/api/v1'
            const stream = await E2BSandboxService.runAgentSession({
                sessionId,
                sandboxId: provisionResult.sandboxId,
                prompt: job.data.prompt || 'You are Antigravity, an AI agent.',
                workspaceDir: '/workspace',
                token,
                apiHostUrl,
            })

            // start listening in the background without blocking the worker pool
            processGrpcStream(sessionId, stream).catch((e: any) =>
                console.error('Stream failed', e)
            )

            return { status: 'RUNNING', sandboxId: provisionResult.sandboxId, token }
        } catch (e: any) {
            console.error(`Failed to process job ${job.id}`, e)
            await prisma.session
                .update({
                    where: { id: sessionId },
                    data: { vmStatus: 'FAILED' },
                })
                .catch(() => {})
            throw e
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
    }
)

worker.on('failed', (job: any, err: any) => {
    console.error(`Job ${job?.id} failed with ${err.message}`)
})
