import { describe, expect, test, mock } from 'bun:test'

import { LsTool } from '../../src/ls'
import { createMockContext } from '../mock-context'

describe('LsTool (Unit)', () => {
    test('should return directory contents successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => ['file1.ts', 'file2.ts'])

        const result = await LsTool.execute({ dirPath: '/src' }, context)
        expect(context.operations.fs.readdir).toHaveBeenCalledWith('/src')
        expect(result).toBe('file1.ts\nfile2.ts')
    })

    test('should default to current directory if dirPath is omitted', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => ['index.ts'])

        const result = await LsTool.execute({}, context)
        expect(context.operations.fs.readdir).toHaveBeenCalledWith('.')
        expect(result).toBe('index.ts')
    })

    test('should handle empty directory gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => [])

        const result = await LsTool.execute({ dirPath: '/empty' }, context)
        expect(result).toBe('Directory is empty.')
    })

    test('should handle errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => {
            throw new Error('Directory does not exist')
        })

        const result = await LsTool.execute({ dirPath: '/nonexistent' }, context)
        expect(result).toBe('Failed to list directory: Directory does not exist')
    })
})
