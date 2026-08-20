import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

import { FileSessionRepository } from '../../apps/cli/src/file-session-repository'

describe('FileSessionRepository Monorepo Load Tests', () => {
    let tmpDir: string
    let repo: FileSessionRepository

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-load-monorepo-'))
        repo = new FileSessionRepository(tmpDir)
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('performs 200 concurrent session saves and 200 concurrent loads without data corruption', async () => {
        const sessionCount = 200

        // 1. Concurrently save 200 sessions with multiple messages each
        const savePromises = Array.from({ length: sessionCount }, (_, idx) => {
            return repo.saveContext(`concurrent-session-${idx}`, [
                {
                    id: `msg-${idx}-1`,
                    role: 'user',
                    content: `User prompt #${idx} requesting complex task breakdown`,
                    timestamp: Date.now(),
                },
                {
                    id: `msg-${idx}-2`,
                    role: 'assistant',
                    content: `Assistant response #${idx} completing step 1`,
                    timestamp: Date.now() + 1,
                    parentId: `msg-${idx}-1`,
                },
                {
                    id: `msg-${idx}-3`,
                    role: 'user',
                    content: `Follow-up query #${idx}`,
                    timestamp: Date.now() + 2,
                    parentId: `msg-${idx}-2`,
                },
            ])
        })
        await Promise.all(savePromises)

        // 2. Concurrently load all 200 sessions
        const loadPromises = Array.from({ length: sessionCount }, async (_, idx) => {
            const history = await repo.loadContext(`concurrent-session-${idx}`)
            expect(history.length).toBe(3)
            expect(history[0]?.content).toContain(`User prompt #${idx}`)
            expect(history[1]?.content).toContain(`Assistant response #${idx}`)
            expect(history[2]?.content).toContain(`Follow-up query #${idx}`)
        })
        await Promise.all(loadPromises)

        // 3. List all 200 sessions and verify metadata
        const listedSessions = await repo.listSessions()
        expect(listedSessions.length).toBe(sessionCount)
        expect(listedSessions[0]?.preview).toBeDefined()
    })
})
