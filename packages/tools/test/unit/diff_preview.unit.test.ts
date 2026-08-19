import { describe, expect, test } from 'bun:test'

import { generateUnifiedDiff } from '../../src/diff_preview'

describe('generateUnifiedDiff (Unit)', () => {
    test('generates unified diff with added and removed lines', () => {
        const oldContent = 'line 1\nline 2\nline 3\n'
        const newContent = 'line 1\nline 2 modified\nline 3\n'
        const diff = generateUnifiedDiff('test.ts', oldContent, newContent)

        expect(diff).toContain('--- a/test.ts')
        expect(diff).toContain('+++ b/test.ts')
        expect(diff).toContain('-line 2')
        expect(diff).toContain('+line 2 modified')
    })

    test('generates unified diff for new file creation', () => {
        const oldContent = ''
        const newContent = 'const a = 1\nconst b = 2\n'
        const diff = generateUnifiedDiff('new.ts', oldContent, newContent)

        expect(diff).toContain('--- a/new.ts')
        expect(diff).toContain('+++ b/new.ts')
        expect(diff).toContain('+const a = 1')
        expect(diff).toContain('+const b = 2')
    })
})
