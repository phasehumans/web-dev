import { ToolExecuteContext } from '@december/shared'
import { describe, it, expect } from 'vitest'

import { createPrReviewTool, submitPrTool } from '../../src/pr'

const mockContext: ToolExecuteContext = {
    agent: {} as any,
    cwd: process.cwd(),
}

describe('pr tools', () => {
    it('createPrReviewTool > executes successfully', async () => {
        const result = await createPrReviewTool.execute(
            {
                prUrl: 'https://github.com/foo/bar/pull/1',
                comments: [],
            },
            mockContext
        )
        expect(result).toBe(
            'Successfully submitted PR review for https://github.com/foo/bar/pull/1.'
        )
    })

    it('submitPrTool > executes successfully', async () => {
        const result = await submitPrTool.execute(
            {
                branch: 'feat/new-thing',
                title: 'New Thing',
                body: 'body text',
            },
            mockContext
        )
        expect(result).toBe('Successfully submitted PR "New Thing" from branch feat/new-thing.')
    })
})
