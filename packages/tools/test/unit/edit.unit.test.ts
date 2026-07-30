import { describe, expect, test, mock } from 'bun:test'

import { EditFileTool } from '../../src/edit'
import { createMockContext } from '../mock-context'

describe('EditFileTool', () => {
    test('should replace exact substring successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'const a = 1\nconst b = 2')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'const a = 1',
                replacementContent: 'const a = 2',
            },
            context
        )

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.ts',
            'const a = 2\nconst b = 2'
        )
        expect(result).toContain('Successfully edited file')
    })

    test('should fall back to line-by-line whitespace trimmed matching', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'const a = 1   \r\nconst b = 2  ')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'const a = 1\nconst b = 2',
                replacementContent: 'const a = 10\nconst b = 20',
            },
            context
        )

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.ts',
            'const a = 10\nconst b = 20'
        )
        expect(result).toContain('matched with normalized whitespace')
    })

    test('should fail if targetContent is not found', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'const a = 1')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'const b = 2',
                replacementContent: 'const b = 3',
            },
            context
        )

        expect(result).toContain('targetContent not found')
        expect(context.operations.fs.writeFile).not.toHaveBeenCalled()
    })
})
