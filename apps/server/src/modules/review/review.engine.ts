import { Queue } from 'bullmq'
import Redis from 'ioredis'

import { env } from '../../env'

import { reviewRepository } from './review.repository'

export interface IGithubBotDispatcher {
    dispatchReview(reviewId: string, prUrl: string): Promise<void>
}

export class E2BGithubBotDispatcher implements IGithubBotDispatcher {
    private simulated = new SimulatedGithubBotDispatcher()

    async dispatchReview(reviewId: string, prUrl: string): Promise<void> {
        try {
            await reviewRepository.updateReview(reviewId, { status: 'IN_PROGRESS' })

            if (env.NODE_ENV === 'test') {
                return
            }

            const redisUrl =
                env.REDIS_URL ||
                (env.NODE_ENV !== 'production' ? 'redis://localhost:6379' : undefined)
            if (redisUrl) {
                const redis = new Redis(redisUrl, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                    enableOfflineQueue: false,
                })
                redis.on('error', () => {})

                await redis.connect().catch(() => {})

                if (redis.status === 'ready') {
                    const agentJobsQueue = new Queue('agent_jobs', { connection: redis as any })
                    await agentJobsQueue.add('pr_review', {
                        reviewId,
                        prUrl,
                        taskType: 'pr_review',
                    })
                    redis.disconnect()
                    return
                }

                redis.disconnect()
            }

            if (env.NODE_ENV !== 'production') {
                await this.simulated.dispatchReview(reviewId, prUrl)
            } else {
                await reviewRepository.updateReview(reviewId, { status: 'FAILED' })
            }
        } catch (e: any) {
            console.warn(
                `[E2BGithubBotDispatcher] Queue dispatch fallback for ${reviewId}:`,
                e?.message || e
            )
            if (env.NODE_ENV !== 'production') {
                await this.simulated.dispatchReview(reviewId, prUrl)
            } else {
                await reviewRepository.updateReview(reviewId, { status: 'FAILED' })
            }
        }
    }
}

export class SimulatedGithubBotDispatcher implements IGithubBotDispatcher {
    async dispatchReview(reviewId: string, prUrl: string): Promise<void> {
        // Asynchronous processing simulation
        setTimeout(async () => {
            try {
                // Step 1: Update status to IN_PROGRESS
                await reviewRepository.updateReview(reviewId, { status: 'IN_PROGRESS' })

                // Step 2: Simulate analysis delay
                await new Promise((resolve) => setTimeout(resolve, 2000))

                // Extract repository name or default
                const repoMatch =
                    prUrl.match(/github\.com\/([^/]+\/[^/]+)/i) ||
                    prUrl.match(/gitlab\.com\/([^/]+\/[^/]+)/i)
                const repository = repoMatch ? repoMatch[1] : 'repository'

                // Realistic review payload generator
                const summary =
                    `### Executive Summary\n\n` +
                    `Reviewed pull request changes for **${repository}**. The codebase shows solid structure with clear modular separation. ` +
                    `Key focus areas evaluated include Security, Performance, and Code Quality.\n\n` +
                    `**Key Highlights:**\n` +
                    `- Good encapsulation of async service handlers and Zod validation contracts.\n` +
                    `- Identified 1 high-priority security vulnerability regarding raw query parameter concatenation.\n` +
                    `- Recommended caching optimization for repeated database lookups.\n`

                const findings = [
                    {
                        id: 'find-1',
                        severity: 'CRITICAL',
                        category: 'SECURITY',
                        filePath: 'src/modules/auth/auth.service.ts',
                        lineNumber: 42,
                        title: 'Potential SQL Injection in dynamic filter query',
                        description:
                            'Raw string concatenation detected in SQL filter clause. User input must be sanitized via Prisma parameterized bindings.',
                        originalSnippet:
                            "const query = `SELECT * FROM users WHERE email = '${userInput}'`;",
                        proposedSnippet:
                            'const query = prisma.user.findFirst({ where: { email: userInput } });',
                    },
                    {
                        id: 'find-2',
                        severity: 'WARNING',
                        category: 'PERFORMANCE',
                        filePath: 'src/modules/session/session.repository.ts',
                        lineNumber: 88,
                        title: 'N+1 query loop when fetching session details',
                        description:
                            'Nested mapping executes sequential DB queries inside array loop. Use single include join clause instead.',
                        originalSnippet:
                            'for (const s of sessions) {\n  const user = await getUser(s.userId);\n}',
                        proposedSnippet:
                            'const sessions = await prisma.session.findMany({\n  include: { user: true }\n});',
                    },
                    {
                        id: 'find-3',
                        severity: 'INFO',
                        category: 'CLEAN_CODE',
                        filePath: 'src/shared/components/ui/Modal.tsx',
                        lineNumber: 31,
                        title: 'Redundant backdrop blur class binding',
                        description:
                            'Consider standardizing modal backdrop blur tokens to maintain visual consistency.',
                        originalSnippet:
                            'className="absolute inset-0 bg-black/75 backdrop-blur-sm"',
                        proposedSnippet:
                            'className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"',
                    },
                ]

                const score = 88

                // Step 3: Complete review with results
                await reviewRepository.updateReview(reviewId, {
                    status: 'COMPLETED',
                    score,
                    summary,
                    findings,
                })
            } catch (err) {
                console.error(`Failed to process simulated review ${reviewId}:`, err)
                await reviewRepository.updateReview(reviewId, { status: 'FAILED' }).catch(() => {})
            }
        }, 500)
    }
}

export const defaultBotDispatcher: IGithubBotDispatcher = new E2BGithubBotDispatcher()

export async function triggerAsyncReview(reviewId: string, prUrl: string) {
    return defaultBotDispatcher.dispatchReview(reviewId, prUrl)
}
