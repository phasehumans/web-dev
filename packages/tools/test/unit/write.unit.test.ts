import { describe, expect, test, mock } from 'bun:test'

import { WriteFileTool } from '../../src/write'
import { createMockContext } from '../mock-context'

describe('WriteFileTool', () => {
    test('should write file contents successfully', async () => {
        const context = createMockContext()

        const result = await WriteFileTool.execute(
            { filePath: '/test.txt', content: 'hello world' },
            context
        )

        expect(context.operations.fs.writeFile).toHaveBeenCalledWith('/test.txt', 'hello world')
        expect(result).toContain('Successfully wrote to')
    })

    test('should handle write errors gracefully', async () => {
        const context = createMockContext()
        context.operations.fs.writeFile = mock(async () => {
            throw new Error('Permission denied')
        })

        const result = await WriteFileTool.execute(
            { filePath: '/root/test.txt', content: 'hack' },
            context
        )

        expect(result).toContain('Failed to write file')
        expect(result).toContain('Permission denied')
    })
})
