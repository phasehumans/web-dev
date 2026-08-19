import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { parseIgnoreLines, getWorkspaceIgnores, isPathIgnored } from '../../src/ignore'

describe('Ignore Engine (Unit)', () => {
    let tmpDir: string

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'december-ignore-test-'))
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('parses ignore lines correctly', () => {
        const content = `
# Comment line
node_modules/
dist/
*.log
/specific-file.txt
`
        const patterns = parseIgnoreLines(content)
        expect(patterns).toContain('node_modules')
        expect(patterns).toContain('node_modules/**')
        expect(patterns).toContain('dist')
        expect(patterns).toContain('dist/**')
        expect(patterns).toContain('*.log')
        expect(patterns).toContain('specific-file.txt')
    })

    it('aggregates .gitignore and .decemberignore into unified ignore list', () => {
        fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'build/\n*.tmp\n')
        fs.writeFileSync(path.join(tmpDir, '.decemberignore'), 'fixtures/\nlarge-mock.sqlite\n')

        const ignores = getWorkspaceIgnores(tmpDir)

        expect(ignores).toContain('build')
        expect(ignores).toContain('build/**')
        expect(ignores).toContain('*.tmp')
        expect(ignores).toContain('fixtures')
        expect(ignores).toContain('fixtures/**')
        expect(ignores).toContain('large-mock.sqlite')
        expect(ignores).toContain('node_modules')
    })

    it('matches ignored paths accurately', () => {
        const patterns = parseIgnoreLines('fixtures/\n*.log\nmock-db.sqlite')
        expect(isPathIgnored('fixtures/data.json', patterns)).toBe(true)
        expect(isPathIgnored('src/fixtures/data.json', patterns)).toBe(true)
        expect(isPathIgnored('debug.log', patterns)).toBe(true)
        expect(isPathIgnored('mock-db.sqlite', patterns)).toBe(true)
        expect(isPathIgnored('src/app.ts', patterns)).toBe(false)
    })
})
