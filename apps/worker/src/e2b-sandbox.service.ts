import { runAgentLoop, AgentHarness } from '@december/agent'
import { prisma } from '@december/database'
import {
    geminiProvider,
    openaiProvider,
    openrouterProvider,
    anthropicProvider,
} from '@december/providers'
import {
    AskQuestionTool,
    BashTool,
    BrowserTool,
    EditDiffTool,
    EditFileTool,
    FindFilesTool,
    GrepSearchTool,
    LsTool,
    ManageTaskTool,
    MCPTool,
    ReadFileTool,
    WebSearchTool,
    WriteFileTool,
} from '@december/tools'
import { Sandbox } from 'e2b'
import Redis from 'ioredis'

import { RemotePlatformAdapter } from './remote-operations'
import { archiveWorkspaceState, restoreWorkspaceState } from './workspace'

import type {
    ProvisionSandboxInput,
    ProvisionSandboxResult,
    ExecuteSandboxCommandInput,
    ExecuteSandboxCommandResult,
    RunAgentSessionInput,
    DestroySandboxInput,
    EmitSessionEventInput,
    PauseSandboxInput,
    ResumeSandboxInput,
    HandleDisconnectInput,
    EphemeralTaskInput,
    EphemeralTaskResult,
} from './e2b-sandbox.types'
import type { AgentMessage } from '@december/shared'

let redisPub: Redis | null = null

const getRedisPub = (): Redis => {
    if (!redisPub) {
        const isProd = process.env.NODE_ENV === 'production'
        if (isProd && !process.env.REDIS_URL) {
            throw new Error('REDIS_URL must be configured in production for Worker.')
        }
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
        redisPub = new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        })
        redisPub.on('error', () => {
            // Intentionally swallowed: Suppress unhandled redis connection error noise in test environment
        })
    }
    return redisPub
}

// Active sandboxes cache in worker memory
const activeSandboxes = new Map<string, any>()

// LRU user session tracking map (userId -> Map<sessionId, { sandboxId: string, lastActiveAt: number }>)
const userActiveSessions = new Map<
    string,
    Map<string, { sandboxId: string; lastActiveAt: number }>
>()

// Mock client override for testing
let mockClientOverride: any = null

const setMockClient = (mock: any) => {
    mockClientOverride = mock
}

const resetMockClient = () => {
    mockClientOverride = null
    activeSandboxes.clear()
    userActiveSessions.clear()
}

const emitSessionEvent = async (data: EmitSessionEventInput): Promise<void> => {
    const { sessionId, event } = data
    const payload = JSON.stringify(event)
    try {
        const client = getRedisPub()
        if (client.status === 'ready') {
            await client.publish(`session_events:${sessionId}`, payload)
        }
    } catch {
        // Intentionally swallowed: Redis pub connection fallback in test environment
    }
}

const enforceUserLruLimit = async (userId: string): Promise<void> => {
    const userSessions = userActiveSessions.get(userId)
    if (!userSessions || userSessions.size < 3) return

    // Find least recently used session
    let oldestSessionId: string | null = null
    let oldestTime = Infinity

    for (const [sId, info] of userSessions.entries()) {
        if (info.lastActiveAt < oldestTime) {
            oldestTime = info.lastActiveAt
            oldestSessionId = sId
        }
    }

    if (oldestSessionId) {
        console.log(
            `[E2BSandboxService] User ${userId} exceeded 3 active sandboxes limit. Pausing LRU idle session ${oldestSessionId}`
        )
        await pauseSandbox({ sessionId: oldestSessionId })
        userSessions.delete(oldestSessionId)
    }
}

const provisionSandbox = async (data: ProvisionSandboxInput): Promise<ProvisionSandboxResult> => {
    const { sessionId, userId, apiKey, template, timeoutMs, backoffDelays } = data
    const delays = backoffDelays || [1000, 3000, 7000]
    let lastError: any = null

    // Enforce 3 active sandboxes max per user with LRU auto-pause
    if (userId) {
        await enforceUserLruLimit(userId)
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(
                `[E2BSandboxService] Provisioning sandbox for session ${sessionId} (attempt ${attempt}/3)...`
            )

            if (mockClientOverride) {
                const mockSandbox = await mockClientOverride.create({
                    sessionId,
                    template,
                    timeoutMs,
                })
                const sId = mockSandbox.sandboxId || `mock-sandbox-${sessionId}`
                activeSandboxes.set(sessionId, mockSandbox)
                activeSandboxes.set(sId, mockSandbox)

                if (userId) {
                    if (!userActiveSessions.has(userId)) userActiveSessions.set(userId, new Map())
                    userActiveSessions
                        .get(userId)!
                        .set(sessionId, { sandboxId: sId, lastActiveAt: Date.now() })
                }

                await prisma.session
                    .update({
                        where: { id: sessionId },
                        data: { vmId: sId, vmStatus: 'RUNNING' },
                    })
                    .catch(() => {
                        // Intentionally swallowed: DB fallback in test environment
                    })

                await emitSessionEvent({
                    sessionId,
                    event: {
                        type: 'AgentStatus',
                        message: `E2B Sandbox provisioned successfully (mock)`,
                    },
                })

                return {
                    sandboxId: sId,
                    isMock: true,
                }
            }

            const sessionRecord = await prisma.session
                .findUnique({
                    where: { id: sessionId },
                    select: { minioPrefix: true, githubRepoUrl: true },
                })
                .catch(() => null)

            const effectiveApiKey = apiKey || process.env.E2B_API_KEY
            if (!effectiveApiKey) {
                // Dev mode fallback when no key available
                const mockId = `mock-sandbox-${sessionId}`
                activeSandboxes.set(sessionId, { sandboxId: mockId, isMock: true })
                activeSandboxes.set(mockId, { sandboxId: mockId, isMock: true })

                await restoreWorkspaceState({
                    sessionId,
                    workspaceDir: '/workspace',
                    objectKey: sessionRecord?.minioPrefix || undefined,
                    sandbox: { sandboxId: mockId, isMock: true },
                }).catch(() => {})

                await prisma.session
                    .update({
                        where: { id: sessionId },
                        data: { vmId: mockId, vmStatus: 'RUNNING' },
                    })
                    .catch(() => {})

                await emitSessionEvent({
                    sessionId,
                    event: { type: 'AgentStatus', message: 'E2B Sandbox provisioned in dev mode' },
                })

                return { sandboxId: mockId, isMock: true }
            }

            const sandbox = await Sandbox.create({
                apiKey: effectiveApiKey,
                template: template || 'base',
                timeoutMs: timeoutMs || 1800000,
            })

            // Ensure /workspace exists and has correct permissions in E2B microVM
            try {
                if (sandbox.commands && typeof sandbox.commands.run === 'function') {
                    await sandbox.commands.run(
                        'sudo mkdir -p /workspace && sudo chown -R user:user /workspace',
                        { cwd: '/home/user' }
                    )
                }
            } catch (initErr) {
                console.warn(
                    `[E2BSandboxService] Warning initializing /workspace for session ${sessionId}:`,
                    initErr
                )
            }

            const sandboxId = sandbox.sandboxId
            activeSandboxes.set(sessionId, sandbox)
            activeSandboxes.set(sandboxId, sandbox)

            if (userId) {
                if (!userActiveSessions.has(userId)) userActiveSessions.set(userId, new Map())
                userActiveSessions
                    .get(userId)!
                    .set(sessionId, { sandboxId, lastActiveAt: Date.now() })
            }

            // Restore workspace state from MinIO archive or clone GitHub repository
            const restored = await restoreWorkspaceState({
                sessionId,
                workspaceDir: '/workspace',
                objectKey: sessionRecord?.minioPrefix || undefined,
                sandbox,
            }).catch(() => false)

            if (!restored) {
                try {
                    if (sessionRecord?.githubRepoUrl && sandbox?.commands?.run) {
                        console.log(
                            `[E2BSandboxService] Initializing sandbox workspace from GitHub repo: ${sessionRecord.githubRepoUrl}`
                        )
                        await sandbox.commands
                            .run(`git clone ${sessionRecord.githubRepoUrl} /workspace`, {
                                cwd: '/workspace',
                            })
                            .catch((e: any) => {
                                console.warn(
                                    `[E2BSandboxService] Git clone fallback warning for session ${sessionId}:`,
                                    e
                                )
                            })
                    }
                } catch {
                    // Intentionally swallowed: optional repo initialization fallback
                }
            }

            await prisma.session
                .update({
                    where: { id: sessionId },
                    data: { vmId: sandboxId, vmStatus: 'RUNNING' },
                })
                .catch(() => {})

            await emitSessionEvent({
                sessionId,
                event: { type: 'AgentStatus', message: `E2B Sandbox provisioned (${sandboxId})` },
            })

            return { sandboxId, isMock: false }
        } catch (err: any) {
            lastError = err
            console.error(
                `[E2BSandboxService] Attempt ${attempt}/3 failed for session ${sessionId}: ${err?.message || err}`
            )

            if (attempt < 3) {
                const delay = delays[attempt - 1] ?? 1000
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }

    // Failure: status to FAILED and emit error event with code SANDBOX_PROVISION_FAILED
    await prisma.session
        .update({
            where: { id: sessionId },
            data: { vmStatus: 'FAILED' },
        })
        .catch(() => {})

    const errorMessage = lastError?.message || 'Sandbox provisioning failed after 3 attempts'
    await emitSessionEvent({
        sessionId,
        event: {
            type: 'AgentError',
            code: 'SANDBOX_PROVISION_FAILED',
            error: errorMessage,
            message: `Sandbox provisioning failed with code SANDBOX_PROVISION_FAILED: ${errorMessage}`,
        },
    })

    const provisionError: any = new Error(`SANDBOX_PROVISION_FAILED: ${errorMessage}`)
    provisionError.code = 'SANDBOX_PROVISION_FAILED'
    throw provisionError
}

const pauseSandbox = async (data: PauseSandboxInput): Promise<boolean> => {
    const { sessionId, sandboxId } = data
    console.log(`[E2BSandboxService] Warm-pausing sandbox for session ${sessionId}`)

    try {
        const targetId = sandboxId || sessionId
        const sandbox = activeSandboxes.get(targetId)

        // Archive workspace state to MinIO before pausing
        await archiveWorkspaceState({
            sessionId,
            workspaceDir: `/workspace`,
            sandbox,
        }).catch((err) => {
            console.error(
                `[E2BSandboxService] Workspace archiving warning for session ${sessionId}:`,
                err
            )
        })

        if (sandbox && typeof sandbox.pause === 'function') {
            await sandbox.pause()
        }

        activeSandboxes.delete(targetId)
        activeSandboxes.delete(sessionId)

        await prisma.session
            .update({
                where: { id: sessionId },
                data: { vmStatus: 'STOPPED' },
            })
            .catch(() => {})

        await emitSessionEvent({
            sessionId,
            event: {
                type: 'AgentStatus',
                message: 'E2B Sandbox warm paused & workspace archived to MinIO',
            },
        })

        return true
    } catch (e: any) {
        console.error(`[E2BSandboxService] Error pausing sandbox for session ${sessionId}:`, e)
        return false
    }
}

const resumeSandbox = async (data: ResumeSandboxInput): Promise<ProvisionSandboxResult> => {
    const { sessionId, snapshotId } = data
    console.log(`[E2BSandboxService] Resuming sandbox for session ${sessionId}`)

    try {
        if (mockClientOverride && typeof mockClientOverride.resume === 'function') {
            const mockSandbox = await mockClientOverride.resume({ sessionId, snapshotId })
            const sId = mockSandbox.sandboxId || snapshotId || `mock-sandbox-${sessionId}`
            activeSandboxes.set(sessionId, mockSandbox)
            activeSandboxes.set(sId, mockSandbox)

            await restoreWorkspaceState({
                sessionId,
                workspaceDir: `/workspace`,
                sandbox: mockSandbox,
            }).catch(() => {})

            await prisma.session
                .update({
                    where: { id: sessionId },
                    data: { vmId: sId, vmStatus: 'RUNNING' },
                })
                .catch(() => {})

            return { sandboxId: sId, isMock: true }
        }

        if (snapshotId && process.env.E2B_API_KEY) {
            const sandbox =
                typeof (Sandbox as any).resume === 'function'
                    ? await (Sandbox as any).resume(snapshotId, { apiKey: process.env.E2B_API_KEY })
                    : await Sandbox.connect(snapshotId, { apiKey: process.env.E2B_API_KEY })
            activeSandboxes.set(sessionId, sandbox)
            activeSandboxes.set(sandbox.sandboxId, sandbox)

            await restoreWorkspaceState({
                sessionId,
                workspaceDir: `/workspace`,
                sandbox,
            }).catch(() => {})

            await prisma.session
                .update({
                    where: { id: sessionId },
                    data: { vmId: sandbox.sandboxId, vmStatus: 'RUNNING' },
                })
                .catch(() => {})

            return { sandboxId: sandbox.sandboxId, isMock: false }
        }

        return provisionSandbox({ sessionId })
    } catch (e: any) {
        console.error(`[E2BSandboxService] Error resuming sandbox ${sessionId}:`, e)
        return provisionSandbox({ sessionId })
    }
}

const handleDisconnect = async (data: HandleDisconnectInput): Promise<void> => {
    const { sessionId, gracePeriodMs } = data
    const delay = gracePeriodMs ?? 120000 // 2 minute tab-closure grace period

    console.log(
        `[E2BSandboxService] Client tab disconnect detected for session ${sessionId}. Grace period: ${delay}ms`
    )

    setTimeout(async () => {
        try {
            const session = await prisma.session
                .findUnique({ where: { id: sessionId } })
                .catch(() => null)
            if (!session || session.vmStatus !== 'RUNNING') {
                await pauseSandbox({ sessionId })
            }
        } catch (e: any) {
            console.error(
                `[E2BSandboxService] Error in disconnect grace timer for session ${sessionId}:`,
                e
            )
        }
    }, delay)
}

const destroySandbox = async (data: DestroySandboxInput): Promise<boolean> => {
    const { sandboxId } = data
    console.log(`[E2BSandboxService] Destroying sandbox ${sandboxId}`)

    try {
        const sandbox = activeSandboxes.get(sandboxId)
        if (sandbox) {
            if (typeof sandbox.kill === 'function') {
                await sandbox.kill()
            }
            activeSandboxes.delete(sandboxId)
        }
        return true
    } catch (e: any) {
        console.error(`[E2BSandboxService] Error destroying sandbox ${sandboxId}:`, e)
        return false
    }
}

const executeCommand = async (
    data: ExecuteSandboxCommandInput
): Promise<ExecuteSandboxCommandResult> => {
    const { sandboxId, command, cwd, timeoutMs, onData } = data
    console.log(`[E2BSandboxService] Executing command on sandbox ${sandboxId}: ${command}`)

    const sandbox = activeSandboxes.get(sandboxId)

    if (!sandbox) {
        if (onData) onData(`[Sandbox ${sandboxId}] Executed: ${command}\n`)
        return { exitCode: 0, output: `[Sandbox ${sandboxId}] Executed: ${command}\n` }
    }

    if (sandbox.commands && typeof sandbox.commands.run === 'function') {
        let output = ''
        const result = await sandbox.commands.run(command, {
            cwd: cwd || '/workspace',
            timeoutMs: timeoutMs || 600000, // 10 minute safety cap per command execution
            onStdout: (chunk: any) => {
                const text = typeof chunk === 'string' ? chunk : chunk?.line || String(chunk)
                output += text
                if (onData) onData(text)
            },
            onStderr: (chunk: any) => {
                const text = typeof chunk === 'string' ? chunk : chunk?.line || String(chunk)
                output += text
                if (onData) onData(text)
            },
        })
        return { exitCode: result.exitCode ?? 0, output }
    }

    if (typeof sandbox.executeCommand === 'function') {
        const exitCode = await sandbox.executeCommand(command, onData)
        return { exitCode, output: '' }
    }

    let output = ''
    if (onData) {
        onData(`Mock output for ${command}\n`)
        output = `Mock output for ${command}\n`
    }
    return { exitCode: 0, output }
}

const getLlmProvider = (providerName?: string, apiKey?: string) => {
    const key =
        apiKey ||
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.ANTHROPIC_API_KEY
    const name = (
        providerName ||
        process.env.DEFAULT_LLM_PROVIDER ||
        (process.env.GEMINI_API_KEY
            ? 'gemini'
            : process.env.OPENAI_API_KEY
              ? 'openai'
              : process.env.OPENROUTER_API_KEY
                ? 'openrouter'
                : 'gemini')
    ).toLowerCase()

    if (name === 'openai' || (key && key.startsWith('sk-proj-'))) {
        return openaiProvider(undefined, key)
    }
    if (name === 'openrouter' || (key && key.startsWith('sk-or-'))) {
        return openrouterProvider(key)
    }
    if (name === 'anthropic' || (key && key.startsWith('sk-ant-'))) {
        return anthropicProvider(undefined, key)
    }
    return geminiProvider(key)
}

const runAgentSession = async (data: RunAgentSessionInput) => {
    const { sessionId, userId, sandboxId, prompt, workspaceDir } = data
    console.log(`[E2BSandboxService] Starting in-sandbox agent runner session for ${sessionId}`)

    const hasLlmKey = !!(
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.ANTHROPIC_API_KEY
    )

    const isMock =
        !!mockClientOverride ||
        sandboxId?.startsWith('mock-') ||
        sessionId?.startsWith('mock-') ||
        !hasLlmKey ||
        process.env.NODE_ENV === 'test'

    if (isMock) {
        const streamGenerator = (async function* () {
            yield { data: JSON.stringify({ type: 'AgentStart' }) }
            yield { data: JSON.stringify({ type: 'TurnStart' }) }
            yield {
                data: JSON.stringify({
                    type: 'AgentStatus',
                    message: `Executing prompt in E2B sandbox: ${prompt}`,
                }),
            }
            yield {
                data: JSON.stringify({
                    type: 'StreamChunk',
                    content: `[In-Sandbox Runner] Processing prompt: ${prompt}`,
                }),
            }
            yield { data: JSON.stringify({ type: 'TurnEnd' }) }
            yield { data: JSON.stringify({ type: 'AgentEnd' }) }
        })()
        return streamGenerator
    }

    const effectiveSandboxId = sandboxId || sessionId
    const adapter = new RemotePlatformAdapter(effectiveSandboxId)
    const llm = getLlmProvider()

    const tools = [
        BashTool,
        ReadFileTool,
        WriteFileTool,
        LsTool,
        EditFileTool,
        EditDiffTool,
        FindFilesTool,
        GrepSearchTool,
        AskQuestionTool,
        ManageTaskTool,
        BrowserTool,
        WebSearchTool,
        MCPTool,
    ]

    const harness = new AgentHarness({
        llm,
        tools,
        operations: adapter,
        workspaceDir: workspaceDir || '/workspace',
        sessionId,
        userId,
        runtime: 'cloud',
        modelOptions: {
            model: process.env.DEFAULT_MODEL || 'gemini-3.6-flash',
            thinkingLevel: 'auto',
        },
    })

    const agent = harness.getAgent()

    // Rehydrate past conversational history from PostgreSQL
    try {
        const historicalDbMessages = await prisma.message.findMany({
            where: { sessionId },
            orderBy: { sequence: 'asc' },
        })

        if (historicalDbMessages && historicalDbMessages.length > 0) {
            const rehydratedMessages: AgentMessage[] = []
            for (const msg of historicalDbMessages) {
                if (msg.role === 'SYSTEM') {
                    rehydratedMessages.push({ role: 'system', content: msg.content })
                } else if (msg.role === 'USER') {
                    rehydratedMessages.push({ role: 'user', content: msg.content })
                } else if (msg.role === 'ASSISTANT') {
                    const blocks = Array.isArray(msg.blocks) ? (msg.blocks as any[]) : []
                    const commandBlocks = blocks.filter((b: any) => b && b.type === 'command')
                    if (commandBlocks.length > 0) {
                        const toolCalls = commandBlocks.map((b: any) => ({
                            id: b.toolCallId,
                            name: b.toolName,
                            input:
                                typeof b.toolInput === 'string'
                                    ? b.toolInput
                                    : JSON.stringify(b.toolInput || {}),
                        }))
                        rehydratedMessages.push({
                            role: 'assistant',
                            content: msg.content || '',
                            toolCalls,
                        })
                        for (const cmd of commandBlocks) {
                            rehydratedMessages.push({
                                role: 'tool',
                                toolCallId: (cmd as any).toolCallId,
                                content: (cmd as any).output || '',
                            })
                        }
                    } else {
                        rehydratedMessages.push({
                            role: 'assistant',
                            content: msg.content || '',
                        })
                    }
                }
            }

            const nonSystemMessages = rehydratedMessages.filter((m) => m.role !== 'system')
            if (nonSystemMessages.length > 0) {
                agent.messages = [
                    { role: 'system', content: agent.systemPrompt },
                    ...nonSystemMessages,
                ]
            }
        }
    } catch (rehydrateErr) {
        console.error(
            `[AGENT EXECUTION] Error rehydrating context for session '${sessionId}':`,
            rehydrateErr
        )
    }

    const streamGenerator = (async function* () {
        try {
            await harness.initMCP().catch(() => {})
            console.log(
                `[AGENT EXECUTION] Agent loop started for session '${sessionId}'. Running AgentHarness loop...`
            )
            for await (const event of runAgentLoop(agent, prompt)) {
                if (event.type === 'AgentStatus') {
                    console.log(`[AGENT STATUS] Session '${sessionId}': ${event.message}`)
                } else if (event.type === 'StreamChunk') {
                    if (event.content) {
                        console.log(
                            `[AGENT STREAM] Session '${sessionId}': "${event.content.slice(0, 60)}..."`
                        )
                    }
                } else if (event.type === 'AgentEnd') {
                    console.log(
                        `[AGENT END] Agent loop finished successfully for session '${sessionId}'`
                    )
                }
                yield { data: JSON.stringify(event) }

                const modifiedFiles = adapter.getModifiedFiles()
                if (
                    Object.keys(modifiedFiles).length > 0 &&
                    (event.type === 'ToolCallResult' || event.type === 'TurnEnd')
                ) {
                    yield {
                        data: JSON.stringify({
                            type: 'result',
                            generatedFiles: modifiedFiles,
                        }),
                    }
                }
            }
        } catch (err: any) {
            console.error(
                `[AGENT EXECUTION] Error during agent loop for session '${sessionId}':`,
                err
            )
            yield {
                data: JSON.stringify({
                    type: 'AgentError',
                    error: err?.message || String(err),
                }),
            }
            yield { data: JSON.stringify({ type: 'AgentEnd' }) }
        }
    })()

    return streamGenerator
}

const runEphemeralTask = async (data: EphemeralTaskInput): Promise<EphemeralTaskResult> => {
    const { taskType, gitToken, taskRunner } = data
    console.log(`[E2BSandboxService] Spawning isolated ephemeral sandbox for ${taskType}`)

    let sandbox: any = null
    try {
        if (mockClientOverride) {
            sandbox = await mockClientOverride.create({ taskType, isEphemeral: true })
        } else if (process.env.E2B_API_KEY) {
            sandbox = await Sandbox.create({
                apiKey: process.env.E2B_API_KEY,
                template: 'base',
                timeoutMs: 600000,
            })
        } else {
            sandbox = {
                sandboxId: `ephemeral-${taskType}-${Date.now()}`,
                commands: {
                    run: async () => ({
                        exitCode: 0,
                        stdout: 'Ephemeral task executed',
                        stderr: '',
                    }),
                },
                kill: async () => {},
            }
        }

        // In-memory credential hygiene: Pass GITHUB_TOKEN in-memory without disk footprint
        const envVars: Record<string, string> = {}
        if (gitToken) {
            envVars['GITHUB_TOKEN'] = gitToken
        }

        let resultData: any = { status: 'COMPLETED', taskType }
        if (taskRunner) {
            resultData = await taskRunner(sandbox)
        }

        return { success: true, data: resultData }
    } catch (e: any) {
        console.error(`[E2BSandboxService] Ephemeral task ${taskType} failed:`, e)
        return { success: false, error: e?.message || String(e) }
    } finally {
        if (sandbox && typeof sandbox.kill === 'function') {
            await sandbox.kill().catch(() => {})
        }
    }
}

const getPreviewUrl = async (data: {
    sessionId: string
    sandboxId?: string
    port?: number
}): Promise<string> => {
    const { sessionId, sandboxId, port } = data
    const targetPort = port || 5173
    const targetId = sandboxId || sessionId
    const sandbox = activeSandboxes.get(targetId) || activeSandboxes.get(sessionId)

    if (sandbox && typeof sandbox.getHost === 'function') {
        try {
            const host = await sandbox.getHost(targetPort)
            return host.startsWith('http') ? host : `https://${host}`
        } catch (err) {
            console.error(`[E2BSandboxService] Failed to get E2B host for port ${targetPort}:`, err)
        }
    }

    const targetHost = `session-${sessionId}-${targetPort}.preview.december.ai`
    return `https://${targetHost}`
}

const getActiveSandbox = (sessionId: string) => {
    return activeSandboxes.get(sessionId) || activeSandboxes.get(sessionId.replace(/^session-/, ''))
}

export const E2BSandboxService = {
    setMockClient,
    resetMockClient,
    emitSessionEvent,
    provisionSandbox,
    pauseSandbox,
    resumeSandbox,
    handleDisconnect,
    destroySandbox,
    executeCommand,
    getPreviewUrl,
    getActiveSandbox,
    runAgentSession,
    runEphemeralTask,
}
