import { prisma } from '@december/database'
import { describe, it, expect, beforeEach, mock } from 'bun:test'

import { E2BSandboxService } from '../../src/e2b-sandbox.service'

describe('Worker Engine Integration Tests (Mock E2B)', () => {
    let updateMock: ReturnType<typeof mock>

    beforeEach(() => {
        E2BSandboxService.resetMockClient()
        updateMock = mock(async () => ({}) as any)
        prisma.session.update = updateMock as any
    })

    it('should provision mock sandbox and stream in-sandbox agent loop for run_agent job', async () => {
        let createCalled = false
        const mockClient = {
            create: async (params: any) => {
                createCalled = true
                return { sandboxId: `sb-integration-${params.sessionId}` }
            },
        }

        E2BSandboxService.setMockClient(mockClient)

        const provisionRes = await E2BSandboxService.provisionSandbox({
            sessionId: 'sess-integ-1',
            userId: 'usr-integ-1',
            backoffDelays: [1, 1, 1],
        })

        expect(provisionRes.sandboxId).toBe('sb-integration-sess-integ-1')
        expect(createCalled).toBe(true)

        const stream = await E2BSandboxService.runAgentSession({
            sessionId: 'sess-integ-1',
            sandboxId: provisionRes.sandboxId,
            prompt: 'Create a landing page',
        })

        const events: any[] = []
        for await (const chunk of stream) {
            events.push(JSON.parse(chunk.data))
        }

        expect(events.length).toBeGreaterThan(0)
        expect(events[0].type).toBe('AgentStart')
    })

    it('should handle ephemeral task execution for PR review cleanly', async () => {
        const mockClient = {
            create: async () => ({
                sandboxId: 'sb-ephemeral-integ',
                commands: {
                    run: async () => ({
                        exitCode: 0,
                        stdout: 'PR Review completed with 0 errors',
                        stderr: '',
                    }),
                },
                kill: async () => {},
            }),
        }

        E2BSandboxService.setMockClient(mockClient)

        const result = await E2BSandboxService.runEphemeralTask({
            taskType: 'security_audit',
            repoUrl: 'https://github.com/example/repo',
            taskRunner: async (sandbox) => {
                const res = await sandbox.commands.run('npm test', { cwd: '/workspace' })
                return { output: res.stdout, status: 'COMPLETED' }
            },
        })

        expect(result.success).toBe(true)
        expect(result.data.output).toContain('PR Review completed')
    })

    it('should fail-over gracefully when mock sandbox throws error', async () => {
        const mockClient = {
            create: async () => {
                throw new Error('E2B Sandbox quota exceeded')
            },
        }

        E2BSandboxService.setMockClient(mockClient)

        let caughtErr: any = null
        try {
            await E2BSandboxService.provisionSandbox({
                sessionId: 'sess-quota-error',
                backoffDelays: [1, 1, 1],
            })
        } catch (err: any) {
            caughtErr = err
        }

        expect(caughtErr).not.toBeNull()
        expect(caughtErr.code).toBe('SANDBOX_PROVISION_FAILED')
        expect(updateMock).toHaveBeenCalledWith({
            where: { id: 'sess-quota-error' },
            data: { vmStatus: 'FAILED' },
        })
    })
})
