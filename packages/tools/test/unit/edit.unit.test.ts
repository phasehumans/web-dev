import { describe, expect, test, mock } from 'bun:test'

import { EditFileTool } from '../../src/edit'
import { createMockContext } from '../mock-context'

describe('EditFileTool (Unit)', () => {
    test('should replace exact substring successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'const a = 1\nconst b = 2')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'const a = 1',
                replacementContent: 'const a = 10',
            },
            context
        )

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.ts',
            'const a = 10\nconst b = 2'
        )
        expect(result).toContain('Successfully edited file')
    })

    test('should fall back to line-by-line whitespace trimmed matching', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'function foo() {   \n  return 1;\n}')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'function foo() {\n  return 1;\n}',
                replacementContent: 'function foo() {\n  return 42;\n}',
            },
            context
        )

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith(
            '/test.ts',
            'function foo() {\n  return 42;\n}'
        )
        expect(result).toContain('matched with normalized whitespace')
    })

    test('should fail if targetContent is not found', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'hello world')

        const result = await EditFileTool.execute(
            {
                path: '/test.ts',
                targetContent: 'missing target',
                replacementContent: 'replacement',
            },
            context
        )

        expect(result).toContain('Error: targetContent not found')
    })

    test('should handle read or write errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => {
            throw new Error('Access denied')
        })

        const result = await EditFileTool.execute(
            {
                path: '/forbidden.ts',
                targetContent: 'a',
                replacementContent: 'b',
            },
            context
        )

        expect(result).toBe('Failed to edit file: Access denied')
    })
})
