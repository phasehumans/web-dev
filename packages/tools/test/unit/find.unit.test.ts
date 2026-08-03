import { describe, expect, test, mock } from 'bun:test'

import { FindFilesTool } from '../../src/find'
import { createMockContext } from '../mock-context'

describe('FindFilesTool (Unit)', () => {
    test('should find files with exact glob pattern successfully', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => './src/index.ts\n./src/app.ts')

        const result = await FindFilesTool.execute({ pattern: '*.ts' }, context)
        expect(context.operations.search.find).toHaveBeenCalledWith('.', '*.ts')
        expect(result).toBe('./src/index.ts\n./src/app.ts')
    })

    test('should auto-expand directory or simple name patterns into glob wildcards', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => './src/utils.ts')

        const resultDir = await FindFilesTool.execute({ pattern: 'src/' }, context)
        expect(context.operations.search.find).toHaveBeenCalledWith('.', 'src/**/*')
        expect(resultDir).toBe('./src/utils.ts')

        const resultName = await FindFilesTool.execute({ pattern: 'utils' }, context)
        expect(context.operations.search.find).toHaveBeenCalledWith('.', '**/*utils*')
        expect(resultName).toBe('./src/utils.ts')
    })

    test('should return empty result message when no files match', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => '')

        const result = await FindFilesTool.execute({ pattern: '*.nonexistent' }, context)
        expect(result).toBe("No files found matching pattern '*.nonexistent'.")
    })

    test('should handle find errors gracefully', async () => {
        const context = createMockContext()
        context.operations.search.find = mock(async () => {
            throw new Error('find failed')
        })

        const result = await FindFilesTool.execute({ pattern: '*.ts' }, context)
        expect(result).toBe('Error finding files: find failed')
    })
})
