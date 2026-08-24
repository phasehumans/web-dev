import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { handleInitCommand } from '../../apps/cli/src/commands'
import { FileSessionRepository } from '../../apps/cli/src/file-session-repository'

describe('CLI Commands, Configuration & Session Persistence E2E Tests', () => {
    it('executes handleInitCommand in temporary workspace and verifies generated templates', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-init-e2e-'))
        const originalCwd = process.cwd()

        try {
            process.chdir(tmpDir)
            await handleInitCommand()

            expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'rules.md'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'skills.md'))).toBe(true)
            expect(fs.existsSync(path.join(tmpDir, '.december', 'settings.json'))).toBe(true)

            const settings = JSON.parse(
                fs.readFileSync(path.join(tmpDir, '.december', 'settings.json'), 'utf-8')
            )
            expect(settings.thinkingLevel).toBe('auto')
            expect(settings.steeringMode).toBe('all')
            expect(settings.followUpMode).toBe('all')
            expect(settings.toolPermission).toBe('always-proceed')
            expect(settings.pathGuard).toBe(true)
        } finally {
            process.chdir(originalCwd)
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })

    it('manages complete session persistence lifecycle with branching and rename operations', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-session-e2e-'))
        const repo = new FileSessionRepository(tmpDir)

        try {
            const sessionId = 'e2e-lifecycle-session'

            // 1. Save multi-turn conversation
            await repo.saveContext(sessionId, [
                {
                    id: 'msg-1',
                    role: 'user',
                    content: 'Initial query from developer',
                    timestamp: 1000,
                },
                {
                    id: 'msg-2',
                    role: 'assistant',
                    content: 'Initial response from agent',
                    timestamp: 1001,
                    parentId: 'msg-1',
                },
            ])

            // 2. Load context and verify branch reconstruction
            const loaded = await repo.loadContext(sessionId)
            expect(loaded.length).toBe(2)
            expect(loaded[0]?.content).toBe('Initial query from developer')
            expect(loaded[1]?.content).toBe('Initial response from agent')

            // 3. Append turn
            await repo.saveContext(sessionId, [
                {
                    id: 'msg-3',
                    role: 'user',
                    content: 'Follow-up question',
                    timestamp: 1002,
                    parentId: 'msg-2',
                },
            ])

            const updated = await repo.loadContext(sessionId)
            expect(updated.length).toBe(3)

            // 4. List sessions
            const list = await repo.listSessions()
            expect(list.length).toBe(1)
            expect(list[0]?.id).toBe(sessionId)
            expect(list[0]?.preview).toBe('Initial query from developer')

            // 5. Rename session
            await repo.renameSession(sessionId, 'e2e-renamed-session')
            const renamedList = await repo.listSessions()
            expect(renamedList[0]?.id).toBe('e2e-renamed-session')

            // 6. Delete session
            await repo.deleteSession('e2e-renamed-session')
            const emptyList = await repo.listSessions()
            expect(emptyList.length).toBe(0)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    })
})
