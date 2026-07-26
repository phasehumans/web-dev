import { describe, expect, test, mock } from 'bun:test'

import { ReadFileTool } from '../../src/read'
import { createMockContext } from '../mock-context'

describe('ReadFileTool', () => {
    test('should return file contents successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readFile = mock(async () => 'hello world')

        const result = await ReadFileTool.execute({ path: '/test.txt' }, context)
        expect(context.operations.fs.readFile).toHaveBeenCalledWith('/test.txt')
        expect(result).toContain('hello world')
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
