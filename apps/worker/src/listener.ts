import { prisma } from '@december/database'
import { calculateGenerationCost, startOfUtcMonth, startOfNextUtcMonth } from '@december/shared'
import Redis from 'ioredis'

import { E2BSandboxService } from './e2b-sandbox.service'
import { syncWorkspaceFilesToS3 } from './workspace'

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
})
redisPub.on('error', () => {
    // Intentionally swallowed: Suppress offline Redis error noise in test environment
})
const redisSub = redisPub.duplicate({ enableReadyCheck: false })
redisSub.on('error', () => {
    // Intentionally swallowed: Suppress offline Redis sub error noise in test environment
})

redisSub.psubscribe('session_events:*', (err) => {
    if (err) {
        // Intentionally swallowed: Fallback during offline Redis test runs
    }
})

redisSub.on('pmessage', (pattern, channel, message) => {
    try {
        const parsed = JSON.parse(message)
        if (parsed.type === 'ClientDisconnect' && parsed.sessionId) {
            E2BSandboxService.handleDisconnect({
                sessionId: parsed.sessionId,
                gracePeriodMs: 120000,
            })
        }
    } catch {
        // Intentionally swallowed: message parse error fallback
    }
})

interface AccumulatedTurn {
    thoughts: string
    content: string
    blocks: any[]
    modifiedFiles: Set<string>
    hasError: boolean
    errorMessage?: string
}

export async function processGrpcStream(sessionId: string, stream: any, sandbox?: any) {
    let hasError = false
    let currentTurn: AccumulatedTurn = {
        thoughts: '',
        content: '',
        blocks: [],
        modifiedFiles: new Set(),
        hasError: false,
    }

    const persistTurnMessage = async () => {
        try {
            if (
                !currentTurn.content &&
                !currentTurn.thoughts &&
                currentTurn.blocks.length === 0 &&
                !currentTurn.hasError
            ) {
                return
            }

            console.log(
                `[WORKER LISTENER] Persisting turn message for session '${sessionId}' with ${currentTurn.blocks.length} blocks...`
            )

            const lastMessage = await prisma.message.findFirst({
                where: { sessionId },
                orderBy: { sequence: 'desc' },
                select: { sequence: true },
            })
            const nextSequence = (lastMessage?.sequence ?? 0) + 1

            const finalContent =
                currentTurn.content ||
                (currentTurn.hasError
                    ? currentTurn.errorMessage || 'Agent Execution Error'
                    : currentTurn.blocks.length > 0
                      ? ''
                      : 'Completed')

            await prisma.message.create({
                data: {
                    sessionId,
                    role: 'ASSISTANT',
                    content: finalContent,
                    status: currentTurn.hasError ? 'error' : 'done',
                    sequence: nextSequence,
                    blocks: currentTurn.blocks.length > 0 ? (currentTurn.blocks as any) : undefined,
                },
            })

            console.log(
                `[WORKER LISTENER] Successfully persisted assistant message (sequence: ${nextSequence}) for session '${sessionId}'`
            )

            // S3 Workspace Sync on Turn Completion
            if (currentTurn.modifiedFiles.size > 0) {
                console.log(
                    `[WORKER LISTENER] Syncing ${currentTurn.modifiedFiles.size} modified files to S3 workspace for session '${sessionId}'...`
                )
                const sandbox = E2BSandboxService.getActiveSandbox(sessionId)
                await syncWorkspaceFilesToS3({
                    sessionId,
                    modifiedFiles: Array.from(currentTurn.modifiedFiles),
                    sandbox,
                })
            }
        } catch (err) {
            console.error(
                `[WORKER LISTENER] Failed to persist message for session ${sessionId}:`,
                err
            )
        } finally {
            currentTurn = {
                thoughts: '',
                content: '',
                blocks: [],
                modifiedFiles: new Set(),
                hasError: false,
            }
        }
    }

    try {
        for await (const event of stream) {
            const parsedEvent = JSON.parse(event.data)
            console.log(
                `[WORKER LISTENER -> REDIS] Session '${sessionId}' -> Publishing event '${parsedEvent.type || 'unknown'}'`
            )

            // publish to socket rooms if redis is connected
            if (redisPub.status === 'ready') {
                await redisPub.publish(`session_events:${sessionId}`, event.data).catch(() => {
                    // Intentionally swallowed: Suppress Redis publish failure during offline/test execution
                })
            }

            const eventType = parsedEvent.type

            if (eventType === 'ThinkingChunk') {
                const chunk = parsedEvent.content || parsedEvent.data?.content || ''
                if (chunk) {
                    currentTurn.thoughts += chunk
                    const lastBlock = currentTurn.blocks[currentTurn.blocks.length - 1]
                    if (lastBlock && lastBlock.type === 'thinking') {
                        lastBlock.content += chunk
                    } else {
                        currentTurn.blocks.push({ type: 'thinking', content: chunk })
                    }
                }
            } else if (eventType === 'StreamChunk') {
                const chunk = parsedEvent.content || parsedEvent.data?.content || ''
                if (chunk) {
                    currentTurn.content += chunk
                    const lastBlock = currentTurn.blocks[currentTurn.blocks.length - 1]
                    if (lastBlock && lastBlock.type === 'text') {
                        lastBlock.content += chunk
                    } else {
                        currentTurn.blocks.push({ type: 'text', content: chunk })
                    }
                }
            } else if (eventType === 'ToolCallStart') {
                const tc = parsedEvent.toolCall || parsedEvent.data?.toolCall || {}
                const toolName = tc.name || 'tool'
                const toolInput = tc.input || tc.args || {}
                const toolCallId = tc.id || `tool-${Date.now()}`

                currentTurn.blocks.push({
                    type: 'command',
                    toolCallId,
                    toolName,
                    toolInput,
                    status: 'running',
                    output: '',
                })

                const filePath = toolInput.filePath || toolInput.path || toolInput.file
                if (filePath && typeof filePath === 'string') {
                    currentTurn.modifiedFiles.add(filePath)
                }
            } else if (eventType === 'ToolExecutionUpdate') {
                const toolCallId = parsedEvent.toolCallId || parsedEvent.data?.toolCallId
                const chunk = parsedEvent.chunk || parsedEvent.data?.chunk || ''
                if (toolCallId && chunk) {
                    const block = currentTurn.blocks.find(
                        (b) => b.type === 'command' && b.toolCallId === toolCallId
                    )
                    if (block) {
                        block.output = `${block.output || ''}${chunk}`
                    }
                }
            } else if (eventType === 'ToolCallResult') {
                const result = parsedEvent.result || parsedEvent.data?.result || {}
                const toolCallId =
                    parsedEvent.toolCallId || parsedEvent.data?.toolCallId || result.toolCallId
                const block = currentTurn.blocks.find(
                    (b) => b.type === 'command' && (!toolCallId || b.toolCallId === toolCallId)
                )
                if (block) {
                    block.status = result.error ? 'error' : 'success'
                    block.output = result.output || result.content || result.error || block.output
                }
            } else if (eventType === 'TurnEnd') {
                await persistTurnMessage()
            } else if (eventType === 'AgentEnd') {
                await persistTurnMessage()
            } else if (eventType === 'AgentUsage') {
                await updateCredits(sessionId, parsedEvent)
            } else if (eventType === 'AgentError') {
                hasError = true
                currentTurn.hasError = true
                currentTurn.errorMessage = parsedEvent.error || parsedEvent.message
                currentTurn.blocks.push({
                    type: 'error',
                    error: currentTurn.errorMessage || 'Agent Execution Error',
                })
                await persistTurnMessage()
                console.error(
                    `[WORKER LISTENER] Session '${sessionId}' AgentError received:`,
                    currentTurn.errorMessage
                )
            }
        }
    } catch (e: any) {
        hasError = true
        console.error(`[WORKER LISTENER] Stream ended for ${sessionId}: ${e?.message || e}`)
    } finally {
        await persistTurnMessage()
        console.log(
            `[WORKER LISTENER] Stream finished for session '${sessionId}'. Setting Prisma session status -> ${hasError ? 'FAILED' : 'STOPPED'}`
        )
        await prisma.session
            .update({
                where: { id: sessionId },
                data: { vmStatus: hasError ? 'FAILED' : 'STOPPED' },
            })
            .catch(() => {
                // Intentionally swallowed: DB fallback during stream cleanup
            })
    }
}

async function updateCredits(sessionId: string, event: any) {
    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { userId: true, projectId: true },
        })
        if (!session) return

        const promptTokens = Number(event.promptTokens) || 0
        const completionTokens = Number(event.completionTokens) || 0
        const totalTokens = promptTokens + completionTokens
        const model = event.model || 'gemini-3.6-flash'
        const now = new Date()
        const periodStart = startOfUtcMonth(now)
        const periodEnd = startOfNextUtcMonth(now)

        const calculatedCost = calculateGenerationCost({
            modelName: model,
            inputTokens: promptTokens,
            outputTokens: completionTokens,
        })

        console.log(
            `[WORKER LISTENER] Recording UsageEvent for session '${sessionId}': model=${model}, promptTokens=${promptTokens}, completionTokens=${completionTokens}, costInCents=${calculatedCost}`
        )

        await prisma.$transaction(async (tx) => {
            if (session.userId) {
                await tx.user.update({
                    where: { id: session.userId },
                    data: {
                        creditBalance: {
                            decrement: calculatedCost,
                        },
                    },
                })
            }

            await tx.usageEvent.create({
                data: {
                    userId: session.userId,
                    sessionId,
                    model,
                    inputTokens: promptTokens,
                    outputTokens: completionTokens,
                    totalTokens,
                    costInCents: calculatedCost,
                    periodStart,
                    periodEnd,
                },
            })
        })
    } catch (err) {
        console.error(
            `[WORKER LISTENER] Failed to record token usage and update credits for session ${sessionId}:`,
            err
        )
    }
}
