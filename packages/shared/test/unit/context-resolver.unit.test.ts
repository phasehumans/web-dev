import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { resolveContextMentions } from '../../src/context-resolver'

describe('resolveContextMentions', () => {
    let tmpDir: string

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'december-context-test-'))
    })

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('returns original prompt when no mentions exist', async () => {
        const result = await resolveContextMentions('hello world', tmpDir)
        expect(result.hasMentions).toBe(false)
        expect(result.expandedPrompt).toBe('hello world')
        expect(result.files.length).toBe(0)
    })

    it('ignores non-existent file mentions', async () => {
        const result = await resolveContextMentions('check @nonexistent.ts please', tmpDir)
        expect(result.hasMentions).toBe(false)
        expect(result.expandedPrompt).toBe('check @nonexistent.ts please')
        expect(result.files.length).toBe(0)
    })

    it('expands whole file content when @file exists', async () => {
        const sampleFile = path.join(tmpDir, 'sample.ts')
        await fs.writeFile(sampleFile, 'const x = 42;\nconsole.log(x);', 'utf8')

        const result = await resolveContextMentions('explain @sample.ts code', tmpDir)
        expect(result.hasMentions).toBe(true)
        expect(result.files.length).toBe(1)
        expect(result.files[0].path).toBe('sample.ts')
        expect(result.expandedPrompt).toContain('<context_file path="sample.ts">')
        expect(result.expandedPrompt).toContain('const x = 42;')
        expect(result.expandedPrompt).toContain('console.log(x);')
        expect(result.expandedPrompt).toContain('</context_file>')
    })

    it('expands specific line range from @file:start-end', async () => {
        const sampleFile = path.join(tmpDir, 'math.ts')
        const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5']
        await fs.writeFile(sampleFile, lines.join('\n'), 'utf8')

        const result = await resolveContextMentions('check @math.ts:2-4', tmpDir)
        expect(result.hasMentions).toBe(true)
        expect(result.files.length).toBe(1)
        expect(result.files[0].startLine).toBe(2)
        expect(result.files[0].endLine).toBe(4)
        expect(result.expandedPrompt).toContain('<context_file path="math.ts" lines="2-4">')
        expect(result.expandedPrompt).toContain('2: line 2')
        expect(result.expandedPrompt).toContain('3: line 3')
        expect(result.expandedPrompt).toContain('4: line 4')
        expect(result.expandedPrompt).not.toContain('1: line 1')
        expect(result.expandedPrompt).not.toContain('5: line 5')
    })

    it('deduplicates multiple mentions of the same file', async () => {
        const sampleFile = path.join(tmpDir, 'auth.ts')
        await fs.writeFile(sampleFile, 'export const auth = true;', 'utf8')

        const result = await resolveContextMentions('look at @auth.ts and @auth.ts again', tmpDir)
        expect(result.hasMentions).toBe(true)
        expect(result.files.length).toBe(1)
        expect(result.contextBlocks.length).toBe(1)
    })
})
