import { describe, expect, test, mock } from 'bun:test'

import { LsTool } from '../../src/ls'
import { createMockContext } from '../helpers/mock-context'

describe('LsTool', () => {
    test('should return directory contents successfully', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => ['[FILE] a.txt', '[DIR] src'])

        const result = await LsTool.execute({ dirPath: './test' }, context)

        expect(context.operations.fs.readdir).toHaveBeenCalledWith('./test')
        expect(result).toContain('[FILE] a.txt')
        expect(result).toContain('[DIR] src')
    })

    test('should default to current directory if dirPath is omitted', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => [])

        const result = await LsTool.execute({}, context) // dirpath is optional

        expect(context.operations.fs.readdir).toHaveBeenCalledWith('.')
        expect(result).toContain('Directory is empty')
    })

    test('should handle errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.readdir = mock(async () => {
            throw new Error('Not a directory')
        })

        const result = await LsTool.execute({ dirPath: '/file.txt' }, context)
        expect(result).toContain('Failed to list directory')
        expect(result).toContain('Not a directory')
    })
})
