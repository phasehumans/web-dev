import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

import { FileSessionRepository } from '../../src/file-session-repository'

describe('CLI FileSessionRepository Load Tests', () => {
    let tmpDir: string
    let sessionRepo: FileSessionRepository

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-session-load-'))
        sessionRepo = new FileSessionRepository(tmpDir)
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('handles 100 concurrent session saves and loads cleanly', async () => {
        const sessionCount = 100

        // Concurrently save 100 distinct sessions
        const savePromises = Array.from({ length: sessionCount }, (_, i) => {
            return sessionRepo.saveContext(`session-load-${i}`, [
                {
                    id: `msg-${i}-1`,
                    role: 'user',
                    content: `User query ${i}`,
                    timestamp: Date.now(),
                },
                {
                    id: `msg-${i}-2`,
                    role: 'assistant',
                    content: `Assistant answer ${i}`,
                    timestamp: Date.now() + 1,
                    parentId: `msg-${i}-1`,
                },
            ])
        })
        await Promise.all(savePromises)

        const sessions = await sessionRepo.listSessions()
        expect(sessions.length).toBe(sessionCount)

        // Concurrently load all 100 sessions
        const loadPromises = Array.from({ length: sessionCount }, async (_, i) => {
            const msgs = await sessionRepo.loadContext(`session-load-${i}`)
            expect(msgs.length).toBe(2)
            expect(msgs[0]?.content).toBe(`User query ${i}`)
            expect(msgs[1]?.content).toBe(`Assistant answer ${i}`)
        })
        await Promise.all(loadPromises)
    })
})
