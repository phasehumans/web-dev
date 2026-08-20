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

    test('should truncate and summarize files exceeding 2000 lines', async () => {
        const context = createMockContext()
        const massiveLines = Array.from({ length: 2500 }, (_, i) => `line ${i + 1}`).join('\n')
        context.operations.fs.readFile = mock(async () => massiveLines)

        const result = await ReadFileTool.execute({ path: '/massive.log' }, context)
        expect(result).toContain('File exceeds size limit (500 KB / 2,000 lines)')
        expect(result).toContain('--- Header Snippet (first 50 lines) ---')
        expect(result).toContain('--- Footer Snippet (last 50 lines) ---')
        expect(result).toContain("Use 'startLine' and 'endLine'")
    })

    test('should truncate and summarize files exceeding 500 KB', async () => {
        const context = createMockContext()
        const bigContent = 'x'.repeat(600 * 1024)
        context.operations.fs.readFile = mock(async () => bigContent)

        const result = await ReadFileTool.execute({ path: '/bundle.js' }, context)
        expect(result).toContain('File exceeds size limit (500 KB / 2,000 lines)')
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
