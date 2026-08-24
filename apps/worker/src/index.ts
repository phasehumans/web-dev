import './env'
import { prisma } from '@december/database'
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'

import { E2BSandboxService } from './e2b-sandbox.service'
import { processGrpcStream } from './listener'

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    throw new Error('REDIS_URL must be configured in production for Worker.')
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const redisConnection: any = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
})
redisConnection.on('error', (err: any) => {
    console.error('[Worker Redis Connection Error]', err?.message || err)
})

console.log("Worker started, waiting for jobs on 'agent_jobs'...")

export const worker = new Worker(
    'agent_jobs',
    async (job: Job) => {
        const { sessionId, userId, taskType, prUrl, gitToken, reviewId } = job.data
        const effectiveTaskType = taskType || job.name
        console.log(
            `Processing job ${job.id} (type: ${effectiveTaskType}) for session ${sessionId || reviewId}`
        )

        // Handle Ephemeral Tasks (PR Review, One-Click Fix, Security Audit)
        const isEphemeralTask = ['pr_review', 'one_click_fix', 'security_audit'].includes(
            effectiveTaskType
        )

        if (isEphemeralTask) {
            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { creditBalance: true },
                })
                if (user && user.creditBalance < 50) {
                    console.warn(
                        `[WORKER ENGINE] Insufficient credits for user '${userId}' to run ephemeral task '${effectiveTaskType}'`
                    )
                    return {
                        reviewId,
                        status: 'FAILED',
                        taskType: effectiveTaskType,
                        output: 'Insufficient balance: A minimum balance of $0.50 is required.',
                    }
                }
            }

            const result = await E2BSandboxService.runEphemeralTask({
                sessionId: sessionId || reviewId,
                taskType: effectiveTaskType as any,
                repoUrl: prUrl,
                gitToken,
                taskRunner: async (sandbox) => {
                    let runOutput = ''
                    if (sandbox.commands?.run) {
                        if (prUrl) {
                            await sandbox.commands
                                .run(`git clone ${prUrl} /workspace`, { cwd: '/workspace' })
                                .catch((e: any) => {
                                    console.warn(
                                        `Git clone warning for ephemeral task: ${e?.message || e}`
                                    )
                                })
                        }

                        if (effectiveTaskType === 'pr_review') {
                            const lintRes = await sandbox.commands
                                .run('npm run lint --if-present', { cwd: '/workspace' })
                                .catch(() => null)
                            const typecheckRes = await sandbox.commands
                                .run('npm run typecheck --if-present', { cwd: '/workspace' })
                                .catch(() => null)
                            runOutput = [lintRes?.stdout, typecheckRes?.stdout]
                                .filter(Boolean)
                                .join('\n')
                        } else if (effectiveTaskType === 'security_audit') {
                            const auditRes = await sandbox.commands
                                .run('npm audit --json', { cwd: '/workspace' })
                                .catch(() => null)
                            runOutput = auditRes?.stdout || ''
                        } else if (effectiveTaskType === 'one_click_fix') {
                            const fixRes = await sandbox.commands
                                .run('npm run fix --if-present', { cwd: '/workspace' })
                                .catch(() => null)
                            runOutput = fixRes?.stdout || 'Fix applied'
                        }
                    }
                    return {
                        reviewId,
                        status: 'COMPLETED',
                        taskType: effectiveTaskType,
                        output: runOutput,
                    }
                },
            })
            return result
        }

        try {
            console.log(
                `[WORKER ENGINE] Picked up job #${job.id} (type: ${effectiveTaskType}) for session '${sessionId}'`
            )

            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { creditBalance: true },
                })
                if (user && user.creditBalance < 1) {
                    console.warn(
                        `[WORKER ENGINE] Insufficient credits for user '${userId}' on session '${sessionId}'`
                    )
                    await prisma.session
                        .update({
                            where: { id: sessionId },
                            data: { vmStatus: 'FAILED' },
                        })
                        .catch(() => {})
                    await E2BSandboxService.emitSessionEvent({
                        sessionId,
                        event: {
                            type: 'AgentError',
                            code: 'INSUFFICIENT_CREDITS',
                            error: 'Insufficient wallet credits',
                            message:
                                'Insufficient wallet credits. Please add credits at https://trydecember.com/settings/billing to continue.',
                        },
                    })
                    return { status: 'FAILED', error: 'Insufficient credits' }
                }
            }

            console.log(
                `[WORKER ENGINE] Setting Prisma session '${sessionId}' status -> PROVISIONING`
            )
            await prisma.session.update({
                where: { id: sessionId },
                data: { vmStatus: 'PROVISIONING' },
            })

            // generate short-lived jwt
            const agentTokenSecret = process.env.AGENT_TOKEN_SECRET
            if (process.env.NODE_ENV === 'production' && !agentTokenSecret) {
                throw new Error('AGENT_TOKEN_SECRET must be configured in production for Worker.')
            }

            const token = jwt.sign({ userId, sessionId }, agentTokenSecret || 'secret', {
                expiresIn: '15m',
            })

            // Provision E2B microVM sandbox with 3x retry backoff and user LRU limit
            console.log(
                `[WORKER ENGINE] Provisioning E2B microVM container for session '${sessionId}' (userId: '${userId || 'anonymous'}')...`
            )
            const provisionResult = await E2BSandboxService.provisionSandbox({ sessionId, userId })
            console.log(
                `[WORKER ENGINE] E2B Sandbox container '${provisionResult.sandboxId}' is RUNNING (isMock: ${provisionResult.isMock}). Initializing agent session...`
            )

            const isProd = process.env.NODE_ENV === 'production'
            const defaultApiUrl = isProd
                ? 'https://api.trydecember.com/api/v1'
                : 'http://localhost:4000/api/v1'

            const apiHostUrl = process.env.SERVER_URL
                ? `${process.env.SERVER_URL.replace(/\/+$/, '')}/api/v1`
                : process.env.API_URL || defaultApiUrl
            const stream = await E2BSandboxService.runAgentSession({
                sessionId,
                sandboxId: provisionResult.sandboxId,
                prompt: job.data.prompt || 'You are Antigravity, an AI agent.',
                workspaceDir: '/workspace',
                token,
                apiHostUrl,
            })

            console.log(
                `[WORKER ENGINE] Agent loop started for session '${sessionId}'. Spawning stream listener...`
            )

            // start listening in the background without blocking the worker pool
            processGrpcStream(sessionId, stream).catch((e: any) =>
                console.error(`[WORKER ENGINE] Stream failed for session ${sessionId}`, e)
            )

            return { status: 'RUNNING', sandboxId: provisionResult.sandboxId, token }
        } catch (e: any) {
            console.error(
                `[WORKER ENGINE] Failed to process job #${job.id} for session ${sessionId}`,
                e
            )
            await prisma.session
                .update({
                    where: { id: sessionId },
                    data: { vmStatus: 'FAILED' },
                })
                .catch(() => {
                    // Intentionally swallowed: DB fallback on job processing error
                })
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

const shutdownGracefully = async () => {
    console.log('Shutting down worker process gracefully...')
    try {
        await worker.close()
        await redisConnection.quit()
    } catch {
        // Intentionally swallowed: Force exit on shutdown fallback
    }
    process.exit(0)
}

process.on('SIGINT', shutdownGracefully)
process.on('SIGTERM', shutdownGracefully)
