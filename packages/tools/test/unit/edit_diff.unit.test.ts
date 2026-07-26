import { describe, expect, test, mock } from 'bun:test'

import { EditDiffTool } from '../../src/edit_diff'
import { createMockContext } from '../helpers/mock-context'

describe('EditDiffTool', () => {
    test('should apply a valid diff successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'hello world\n')

        const diff = `--- a/test.txt
+++ b/test.txt
@@ -1 +1 @@
-hello world
+hello universe`

        const result = await EditDiffTool.execute({ path: '/test.txt', diff }, context)

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.txt',
            'hello universe\n'
        )
        expect(result).toContain('Successfully patched file')
    })

    test('should fail if diff is malformed or patching fails', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => {
            throw new Error('File not found')
        })

        const result = await EditDiffTool.execute(
            { path: '/missing.txt', diff: 'invalid diff string' },
            context
        )

        expect(result).toContain('Failed to patch file')
        expect(context.operations.fs.writeFile).not.toHaveBeenCalled()
    })
})
