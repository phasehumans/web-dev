import { mkdtemp, rm, writeFile as fsWriteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

import { ReadFileTool } from '../../src/read'
import { WriteFileTool } from '../../src/write'
import { createMockContext } from '../mock-context'

describe('Filesystem Tools Load & Concurrency Tests', () => {
    let testDir: string
    let context: any

    beforeEach(async () => {
        testDir = await mkdtemp(join(tmpdir(), 'december-fs-load-'))
        context = createMockContext()
        context.operations.env.cwd = () => testDir
        context.operations.fs.readFile = async (p: string) => {
            const fullPath = p.startsWith('/') ? p : join(testDir, p)
            return await Bun.file(fullPath).text()
        }
        context.operations.fs.writeFile = async (p: string, content: string) => {
            const fullPath = p.startsWith('/') ? p : join(testDir, p)
            await fsWriteFile(fullPath, content, 'utf-8')
        }
    })

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true })
    })

    it('performs 50 concurrent file writes and 50 concurrent reads without race conditions', async () => {
        const fileCount = 50

        // Parallel writes
        const writePromises = Array.from({ length: fileCount }, (_, i) => {
            const filePath = join(testDir, `load-file-${i}.txt`)
            return WriteFileTool.execute(
                { filePath, content: `Content payload for index ${i}` },
                context
            )
        })
        await Promise.all(writePromises)

        // Parallel reads
        const readPromises = Array.from({ length: fileCount }, async (_, i) => {
            const filePath = join(testDir, `load-file-${i}.txt`)
            const content = await ReadFileTool.execute({ path: filePath }, context)
            expect(content).toContain(`Content payload for index ${i}`)
        })
        await Promise.all(readPromises)
    })
})
