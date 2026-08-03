import { describe, expect, test, mock } from 'bun:test'

import { GrepSearchTool } from '../../src/grep'
import { createMockContext } from '../mock-context'

describe('GrepSearchTool (Unit)', () => {
    test('should search files successfully', async () => {
        const context = createMockContext()
        context.operations.search.grep = mock(async () => 'file1.ts:1:const x = 1')

        const result = await GrepSearchTool.execute({ query: 'const x' }, context)
        expect(context.operations.search.grep).toHaveBeenCalledWith('.', 'const x')
        expect(result).toBe('file1.ts:1:const x = 1')
    })

    test('should handle empty grep matches gracefully', async () => {
        const context = createMockContext()
        context.operations.search.grep = mock(async () => '')

        const result = await GrepSearchTool.execute({ query: 'missing' }, context)
        expect(result).toBe('No matches found.')
    })

    test('should handle search errors gracefully', async () => {
        const context = createMockContext()
        context.operations.search.grep = mock(async () => {
            throw new Error('Grep failed')
        })

        const result = await GrepSearchTool.execute(
            { query: 'test', directory: '/invalid' },
            context
        )
        expect(result).toBe('Error running grep: Grep failed')
    })
})
