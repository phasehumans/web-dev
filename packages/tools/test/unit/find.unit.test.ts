import { describe, expect, test, mock } from 'bun:test'

import { FindFilesTool } from '../../src/find'
import { createMockContext } from '../helpers/mock-context'

describe('FindFilesTool', () => {
    test('should find files successfully', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => './src/index.ts\n./src/app.ts')

        const result = await FindFilesTool.execute({ pattern: '*.ts' }, context)

        expect(context.operations.search.find).toHaveBeenCalledWith('.', '*.ts')
        expect(result).toContain('./src/index.ts')
    })

    test('should handle find errors gracefully', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => {
            throw new Error('find failed')
        })

        const result = await FindFilesTool.execute({ pattern: '*.ts' }, context)
        expect(result).toContain('Error finding files')
        expect(result).toContain('find failed')
    })
})
