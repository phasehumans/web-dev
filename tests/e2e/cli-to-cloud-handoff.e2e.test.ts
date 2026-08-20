import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { prisma } from '@december/database'
import { describe, expect, it, beforeEach } from 'bun:test'

import { reconcileCliMessages } from '../../apps/server/src/modules/cli/cli.utils'
import { E2BSandboxService } from '../../apps/worker/src/e2b-sandbox.service'
import { createWorkspaceArchive } from '../../packages/tui/src/utils/handoff'

describe('End-to-End CLI-to-Cloud /handoff Session Migration Lifecycle', () => {
    let mockSessionDb: Map<string, any>
    let mockMessageDb: Map<string, any[]>

    beforeEach(() => {
        mockSessionDb = new Map()
        mockMessageDb = new Map()

        prisma.session.findUnique = (async ({ where }: any) => {
            return mockSessionDb.get(where.id) || null
        }) as any

        prisma.session.update = (async ({ where, data }: any) => {
            const existing = mockSessionDb.get(where.id) || { id: where.id }
            const updated = { ...existing, ...data }
            mockSessionDb.set(where.id, updated)
            return updated
        }) as any

        prisma.message.findMany = (async ({ where }: any) => {
            return mockMessageDb.get(where.sessionId) || []
        }) as any
    })

    it('executes complete handoff migration from local CLI archive to cloud agent rehydration', async () => {
        // 1. Local Workspace Preparation with sensitive secrets & source code
        const localWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-e2e-local-'))
        const archiveFile = path.join(localWorkspaceDir, '.december-handoff.tar.gz')
        const cloudRestoreDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-e2e-cloud-'))

        try {
            fs.writeFileSync(
                path.join(localWorkspaceDir, 'package.json'),
                JSON.stringify({ name: 'my-app' })
            )
            fs.mkdirSync(path.join(localWorkspaceDir, 'src'), { recursive: true })
            fs.writeFileSync(
                path.join(localWorkspaceDir, 'src', 'index.ts'),
                'export const hello = "world";'
            )
            fs.writeFileSync(
                path.join(localWorkspaceDir, '.env'),
                'SECRET_API_KEY=super-secret-123'
            )
            fs.writeFileSync(
                path.join(localWorkspaceDir, '.env.production'),
                'PROD_DB_URL=postgres://prod'
            )
            fs.writeFileSync(path.join(localWorkspaceDir, 'id_rsa'), 'PRIVATE_SSH_KEY')

            // 2. CLI Archiving with strict secret redaction
            await createWorkspaceArchive(archiveFile, localWorkspaceDir)
            expect(fs.existsSync(archiveFile)).toBe(true)

            // Verify tarball contents
            const { execSync } = await import('node:child_process')
            execSync(`tar -xzf "${archiveFile}" -C "${cloudRestoreDir}"`)

            expect(fs.existsSync(path.join(cloudRestoreDir, 'package.json'))).toBe(true)
            expect(fs.existsSync(path.join(cloudRestoreDir, 'src', 'index.ts'))).toBe(true)
            expect(fs.existsSync(path.join(cloudRestoreDir, '.env'))).toBe(false)
            expect(fs.existsSync(path.join(cloudRestoreDir, '.env.production'))).toBe(false)
            expect(fs.existsSync(path.join(cloudRestoreDir, 'id_rsa'))).toBe(false)

            // 3. Local CLI Multi-turn Conversation with Tool Executions
            const cliAgentMessages = [
                { role: 'system', content: 'You are December coding assistant.' },
                { role: 'user', content: 'Create index.ts with hello world' },
                {
                    role: 'assistant',
                    content: '',
                    thoughts: 'Writing index.ts',
                    toolCalls: [
                        {
                            id: 'call-write-1',
                            name: 'write_file',
                            input: {
                                targetFile: 'src/index.ts',
                                codeContent: 'export const hello = "world";',
                            },
                        },
                    ],
                },
                {
                    role: 'tool',
                    toolCallId: 'call-write-1',
                    content: 'File src/index.ts created successfully.',
                },
                {
                    role: 'assistant',
                    content: 'I have created src/index.ts.',
                },
            ]

            // 4. Server Handoff Reconciliation
            const reconciled = reconcileCliMessages(cliAgentMessages)
            expect(reconciled.length).toBe(4) // system, user, assistant(with command block), assistant(text)

            const sessionId = 'handoff-e2e-session-1'
            const objectKey = 'handoffs/user-123/123456789-handoff.tar.gz'

            mockSessionDb.set(sessionId, {
                id: sessionId,
                userId: 'user-123',
                title: 'Handoff from my-app',
                type: 'CLI',
                minioPrefix: objectKey,
                vmStatus: 'STOPPED',
            })

            mockMessageDb.set(
                sessionId,
                reconciled.map((r, i) => ({
                    id: `msg-${i}`,
                    sessionId,
                    role: r.role,
                    content: r.content,
                    blocks: r.blocks || null,
                    sequence: r.sequence,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
            )

            // 5. Worker Sandbox Provisioning & Workspace State Restoration
            const executedSandboxCommands: string[] = []
            const mockSandbox = {
                sandboxId: 'sb-handoff-cloud-e2e',
                commands: {
                    run: async (cmd: string) => {
                        executedSandboxCommands.push(cmd)
                        return { exitCode: 0, stdout: '', stderr: '' }
                    },
                },
            }

            E2BSandboxService.setMockClient({ create: async () => mockSandbox })

            const provisionRes = await E2BSandboxService.provisionSandbox({
                sessionId,
                userId: 'user-123',
                backoffDelays: [1, 1, 1],
            })

            expect(provisionRes.sandboxId).toBe('sb-handoff-cloud-e2e')
            const updatedSession = mockSessionDb.get(sessionId)
            expect(updatedSession.vmStatus).toBe('RUNNING')
            expect(updatedSession.vmId).toBe('sb-handoff-cloud-e2e')

            // 6. Cloud Agent Session Rehydration & Turn Execution
            const stream = await E2BSandboxService.runAgentSession({
                sessionId,
                sandboxId: 'sb-handoff-cloud-e2e',
                prompt: 'Now add a test file for index.ts',
                workspaceDir: cloudRestoreDir,
            })

            const streamedEvents: any[] = []
            for await (const chunk of stream) {
                streamedEvents.push(JSON.parse(chunk.data))
            }

            expect(streamedEvents.length).toBeGreaterThan(0)
            expect(streamedEvents[0].type).toBe('AgentStart')
            expect(streamedEvents.some((e) => e.type === 'AgentEnd')).toBe(true)
        } finally {
            fs.rmSync(localWorkspaceDir, { recursive: true, force: true })
            fs.rmSync(cloudRestoreDir, { recursive: true, force: true })
        }
    })
})
