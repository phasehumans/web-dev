import { describe, expect, test, mock } from 'bun:test'

import { GrepSearchTool } from '../../src/grep'
import { createMockContext } from '../mock-context'

describe('GrepSearchTool', () => {
    test('should search files successfully', async () => {
        const context = createMockContext()
        context.operations.search.grep = mock(async () => 'file.ts:1: hello')

        const result = await GrepSearchTool.execute({ directory: './src', query: 'hello' }, context)

        expect(context.operations.search.grep).toHaveBeenCalledWith('./src', 'hello')
        expect(result).toContain('file.ts:1: hello')
    })

    test('should handle search errors gracefully', async () => {
        const context = createMockContext()
        context.operations.search.grep = mock(async () => {
            throw new Error('grep not found')
        })

        const result = await GrepSearchTool.execute({ directory: '.', query: 'test' }, context)
        expect(result).toContain('Error running grep')
        expect(result).toContain('grep not found')
    })
})
