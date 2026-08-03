import { describe, expect, test, mock } from 'bun:test'

import { ReadFileTool } from '../../src/read'
import { createMockContext } from '../mock-context'

describe('ReadFileTool (Unit)', () => {
    test('should return full file contents successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'line 1\nline 2\nline 3')

        const result = await ReadFileTool.execute({ path: '/test.txt' }, context)
        expect(context.operations.fs.readFile).toHaveBeenCalledWith('/test.txt')
        expect(result).toBe('line 1\nline 2\nline 3')
    })

    test('should support line pagination with startLine and endLine', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'line 1\nline 2\nline 3\nline 4\nline 5')

        const result = await ReadFileTool.execute(
            { path: '/test.txt', startLine: 2, endLine: 4 },
            context
        )
        expect(result).toBe('line 2\nline 3\nline 4')
    })

    test('should support noTruncate flag', async () => {
        const context = createMockContext()
        const longContent = 'A'.repeat(50000)
        context.operations.fs.readFile = mock(async () => longContent)

        const result = await ReadFileTool.execute({ path: '/big.txt', noTruncate: true }, context)
        expect(result.length).toBe(50000)
    })

    test('should handle read errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => {
            throw new Error('File not found')
        })

        const result = await ReadFileTool.execute({ path: '/missing.txt' }, context)
        expect(result).toContain('Failed to read file')
        expect(result).toContain('File not found')
    })
})
