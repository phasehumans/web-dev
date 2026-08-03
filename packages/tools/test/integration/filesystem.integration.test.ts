import { mkdtemp, rm, writeFile as fsWriteFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'

import { EditFileTool } from '../../src/edit'
import { EditDiffTool } from '../../src/edit_diff'
import { LsTool } from '../../src/ls'
import { ReadFileTool } from '../../src/read'
import { WriteFileTool } from '../../src/write'
import { createMockContext } from '../mock-context'

describe('Filesystem Tools Integration', () => {
    let testDir: string
    let context: any

    beforeEach(async () => {
        testDir = await mkdtemp(join(tmpdir(), 'december-tools-fs-test-'))
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
        context.operations.fs.readdir = async (p: string) => {
            const fullPath = p.startsWith('/') ? p : join(testDir, p)
            const { readdir } = await import('node:fs/promises')
            return await readdir(fullPath)
        }
    })

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true })
    })

    test('write tool creates real file and read tool reads it back', async () => {
        const filePath = join(testDir, 'hello.txt')

        await WriteFileTool.execute({ filePath, content: 'Integration test content' }, context)
        const readResult = await ReadFileTool.execute({ path: filePath }, context)

        expect(readResult).toContain('Integration test content')
    })

    test('edit tool modifies existing file in place', async () => {
        const filePath = join(testDir, 'edit.txt')
        await fsWriteFile(filePath, 'line1\nline2\nline3', 'utf-8')

        await EditFileTool.execute(
            { path: filePath, targetContent: 'line2', replacementContent: 'line2_updated' },
            context
        )

        const updatedContent = await Bun.file(filePath).text()
        expect(updatedContent).toContain('line2_updated')
    })

    test('edit_diff tool applies unified patch to real file', async () => {
        const filePath = join(testDir, 'diff.txt')
        await fsWriteFile(filePath, 'alpha\nbeta\ngamma', 'utf-8')

        const diff = `@@ -1,3 +1,3 @@\n alpha\n-beta\n+beta_patched\n gamma`
        const diffRes = await EditDiffTool.execute({ path: filePath, diff }, context)

        expect(diffRes).toContain('Successfully patched file')
        const updatedContent = await Bun.file(filePath).text()
        expect(updatedContent).toBe('alpha\nbeta_patched\ngamma')
    })

    test('ls tool lists files in temporary directory', async () => {
        await fsWriteFile(join(testDir, 'fileA.txt'), 'A', 'utf-8')
        await fsWriteFile(join(testDir, 'fileB.txt'), 'B', 'utf-8')

        const lsResult = await LsTool.execute({ dirPath: testDir }, context)
        expect(lsResult).toContain('fileA.txt')
        expect(lsResult).toContain('fileB.txt')
    })
})
