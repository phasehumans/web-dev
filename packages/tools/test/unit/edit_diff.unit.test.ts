import { describe, expect, test, mock } from 'bun:test'

import { EditDiffTool } from '../../src/edit_diff'
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
