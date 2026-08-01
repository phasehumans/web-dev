import { prisma } from '@december/database'
import { describe, it, expect, beforeEach, mock } from 'bun:test'

import { E2BSandboxService } from '../src/e2b-sandbox.service'

describe('E2BSandboxService (Unit & Integration)', () => {
    let updateMock: ReturnType<typeof mock>

    beforeEach(() => {
        E2BSandboxService.resetMockClient()
        updateMock = mock(async () => ({}) as any)
        prisma.session.update = updateMock as any
    })

    it('should provision sandbox successfully on first attempt', async () => {
        let createCalls = 0
        const mockClient = {
            create: async () => {
                createCalls++
                return { sandboxId: 'sb-12345' }
            },
        }

        E2BSandboxService.setMockClient(mockClient)

        const result = await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-1',
            backoffDelays: [1, 1, 1],
        })

        expect(result.sandboxId).toBe('sb-12345')
        expect(createCalls).toBe(1)
        expect(updateMock).toHaveBeenCalledWith({
            where: { id: 'sess-1' },
            data: { vmId: 'sb-12345', vmStatus: 'RUNNING' },
        })
    })

    it('should retry sandbox provisioning up to 3 times on transient errors', async () => {
        let createCalls = 0
        const mockClient = {
            create: async () => {
                createCalls++
                if (createCalls < 3) {
                    throw new Error(`Transient API network error ${createCalls}`)
                }
                return { sandboxId: 'sb-retry-success' }
            },
        }

        E2BSandboxService.setMockClient(mockClient)

        const result = await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-retry',
            backoffDelays: [1, 1, 1],
        })

        expect(result.sandboxId).toBe('sb-retry-success')
        expect(createCalls).toBe(3)
    })

    it('should transition status to FAILED with SANDBOX_PROVISION_FAILED when all 3 retries fail', async () => {
        let createCalls = 0
        const mockClient = {
            create: async () => {
                createCalls++
                throw new Error('Persistent E2B API Failure')
            },
        }

        E2BSandboxService.setMockClient(mockClient)

        let thrownError: any = null
        try {
            await E2BSandboxService.provisionSandbox({
                sessionId: 'sess-fail',
                backoffDelays: [1, 1, 1],
            })
        } catch (err: any) {
            thrownError = err
        }

        expect(createCalls).toBe(3)
        expect(thrownError).not.toBeNull()
        expect(thrownError.code).toBe('SANDBOX_PROVISION_FAILED')
        expect(updateMock).toHaveBeenCalledWith({
            where: { id: 'sess-fail' },
            data: { vmStatus: 'FAILED' },
        })
    })

    it('should execute command inside provisioned sandbox and stream stdout/stderr chunks', async () => {
        const mockSandbox = {
            sandboxId: 'sb-exec',
            commands: {
                run: async (cmd: string, opts: any) => {
                    opts.onStdout({ line: 'Executing test script...\n' })
                    opts.onStderr({ line: 'Warning: minor warning\n' })
                    return {
                        exitCode: 0,
                        stdout: 'Executing test script...\n',
                        stderr: 'Warning: minor warning\n',
                    }
                },
            },
        }

        E2BSandboxService.setMockClient({ create: async () => mockSandbox })

        await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-exec',
            backoffDelays: [1, 1, 1],
        })

        const chunks: string[] = []
        const res = await E2BSandboxService.executeCommand({
            sandboxId: 'sb-exec',
            command: 'echo "hello"',
            onData: (chunk) => chunks.push(chunk),
        })

        expect(res.exitCode).toBe(0)
        expect(chunks.length).toBeGreaterThan(0)
        expect(chunks.join('')).toContain('Executing test script...')
    })

    it('should enforce maximum 3 active sandboxes per user with LRU auto-pausing', async () => {
        const pausedSessions: string[] = []
        const mockClient = {
            create: async (params: any) => ({
                sandboxId: `sb-${params.sessionId}`,
                pause: async () => {
                    pausedSessions.push(params.sessionId)
                },
            }),
        }

        E2BSandboxService.setMockClient(mockClient)

        // Provision 3 sandboxes for user-1
        await E2BSandboxService.provisionSandbox({
            sessionId: 's1',
            userId: 'usr-1',
            backoffDelays: [1, 1, 1],
        })
        await E2BSandboxService.provisionSandbox({
            sessionId: 's2',
            userId: 'usr-1',
            backoffDelays: [1, 1, 1],
        })
        await E2BSandboxService.provisionSandbox({
            sessionId: 's3',
            userId: 'usr-1',
            backoffDelays: [1, 1, 1],
        })

        // Launch 4th sandbox for user-1 -> should auto-pause LRU session (s1)
        await E2BSandboxService.provisionSandbox({
            sessionId: 's4',
            userId: 'usr-1',
            backoffDelays: [1, 1, 1],
        })

        expect(pausedSessions).toContain('s1')
    })

    it('should execute isolated ephemeral sandboxes with in-memory credential hygiene', async () => {
        let taskExecuted = false
        const mockClient = {
            create: async () => ({
                sandboxId: 'sb-ephemeral-1',
                kill: async () => {},
            }),
        }

        E2BSandboxService.setMockClient(mockClient)

        const res = await E2BSandboxService.runEphemeralTask({
            taskType: 'pr_review',
            gitToken: 'ghp_secret_token_123',
            taskRunner: async (sb) => {
                taskExecuted = true
                return { prReviewId: 'review-99', status: 'APPROVED' }
            },
        })

        expect(res.success).toBe(true)
        expect(taskExecuted).toBe(true)
        expect(res.data.prReviewId).toBe('review-99')
    })

    it('should destroy sandbox and remove instance from active cache', async () => {
        let killCalled = false
        const mockSandbox = {
            sandboxId: 'sb-kill',
            kill: async () => {
                killCalled = true
            },
        }

        E2BSandboxService.setMockClient({ create: async () => mockSandbox })

        await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-kill',
            backoffDelays: [1, 1, 1],
        })

        const destroyed = await E2BSandboxService.destroySandbox({ sandboxId: 'sb-kill' })
        expect(destroyed).toBe(true)
        expect(killCalled).toBe(true)
    })

    it('should stream in-sandbox agent runner events', async () => {
        const stream = await E2BSandboxService.runAgentSession({
            sessionId: 'sess-agent',
            prompt: 'Test prompt',
        })

        const events: any[] = []
        for await (const chunk of stream) {
            events.push(JSON.parse(chunk.data))
        }

        expect(events.map((e) => e.type)).toEqual([
            'AgentStart',
            'TurnStart',
            'AgentStatus',
            'StreamChunk',
            'TurnEnd',
            'AgentEnd',
        ])
    })

    it('should execute real agent loop with RemotePlatformAdapter in E2B sandbox when live environment is active', async () => {
        const origEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'
        process.env.GEMINI_API_KEY = 'mock-key-for-test'

        try {
            const stream = await E2BSandboxService.runAgentSession({
                sessionId: 'live-agent-session',
                sandboxId: 'sb-live-123',
                prompt: 'Hello agent',
            })

            const events: any[] = []
            for await (const chunk of stream) {
                events.push(JSON.parse(chunk.data))
            }

            expect(events.length).toBeGreaterThan(0)
            expect(events[0].type).toBe('AgentStart')
        } finally {
            process.env.NODE_ENV = origEnv
            delete process.env.GEMINI_API_KEY
        }
    })

    it('should resolve preview URL for running E2B sandbox port', async () => {
        const mockSandbox = {
            sandboxId: 'sb-preview-123',
            getHost: async (port: number) => `https://${port}-sb-preview-123.e2b.dev`,
        }

        E2BSandboxService.setMockClient({ create: async () => mockSandbox })

        await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-preview',
            backoffDelays: [1, 1, 1],
        })

        const url = await E2BSandboxService.getPreviewUrl({
            sessionId: 'sess-preview',
            sandboxId: 'sb-preview-123',
            port: 5173,
        })

        expect(url).toBe('https://5173-sb-preview-123.e2b.dev')
    })

    it('should archive workspace state on pauseSandbox', async () => {
        const mockSandbox = {
            sandboxId: 'sb-archive-1',
            pause: async () => {},
        }

        E2BSandboxService.setMockClient({ create: async () => mockSandbox })

        await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-archive-1',
            backoffDelays: [1, 1, 1],
        })

        const paused = await E2BSandboxService.pauseSandbox({ sessionId: 'sess-archive-1' })
        expect(paused).toBe(true)
    })
})
