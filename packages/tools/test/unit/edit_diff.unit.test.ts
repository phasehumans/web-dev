import { describe, expect, test, mock } from 'bun:test'

import { EditDiffTool } from '../../src/edit_diff'
import { applyFuzzyPatchTS } from '../../src/fuzzy_patch'
import { createMockContext } from '../mock-context'

describe('EditDiffTool (Unit)', () => {
    test('should apply a valid diff successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'line 1\nline 2\nline 3')

        const validDiff = `@@ -1,3 +1,3 @@\n line 1\n-line 2\n+line 2 updated\n line 3`

        const result = await EditDiffTool.execute({ path: '/test.txt', diff: validDiff }, context)

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.txt',
            'line 1\nline 2 updated\nline 3'
        )
        expect(result).toBe('Successfully patched file: /test.txt')
    })

    test('should handle fuzzy diff matching when line numbers shift', async () => {
        const context = createMockContext()
        // Content has extra lines at top, shifting target lines down
        context.operations.fs.readFile = mock(
            async () => 'header 1\nheader 2\nline 1\nline 2\nline 3'
        )

        // Hunk header says line 1, but actual lines are at line 3
        const shiftedDiff = `@@ -1,3 +1,3 @@\n line 1\n-line 2\n+line 2 updated\n line 3`

        const result = await EditDiffTool.execute({ path: '/test.txt', diff: shiftedDiff }, context)

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.txt',
            'header 1\nheader 2\nline 1\nline 2 updated\nline 3'
        )
        expect(result).toBe('Successfully patched file: /test.txt')
    })

    test('should test pure TypeScript applyFuzzyPatchTS directly', () => {
        const orig = 'first line\nsecond line\nthird line'
        const diff =
            '@@ -1,3 +1,3 @@\n first line\n-second line\n+second line replaced\n third line'

        const patched = applyFuzzyPatchTS(orig, diff)
        expect(patched).toBe('first line\nsecond line replaced\nthird line')
    })

    test('should fail if diff is malformed or patching fails', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'completely different content')

        const badDiff = `@@ -1,3 +1,3 @@\n line 1\n-line 2\n+line 2 updated\n line 3`

        const result = await EditDiffTool.execute({ path: '/test.txt', diff: badDiff }, context)

        expect(result).toContain('Error: Failed to apply unified diff patch')
    })

    test('should handle read or write errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => {
            throw new Error('Disk read error')
        })

        const result = await EditDiffTool.execute(
            { path: '/test.txt', diff: '@@ -1 +1 @@' },
            context
        )

        expect(result).toBe('Failed to patch file: Disk read error')
    })
})
