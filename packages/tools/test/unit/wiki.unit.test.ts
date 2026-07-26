import { ToolExecuteContext } from '@december/shared'
import { describe, it, expect } from 'vitest'

import { readWikiTool, updateWikiTool } from '../../src/wiki'

const mockContext: ToolExecuteContext = {
    agent: {} as any,
    cwd: process.cwd(),
}

describe('wiki tools', () => {
    it('readWikiTool > executes successfully', async () => {
        const result = await readWikiTool.execute({ pageId: 'Home' }, mockContext)
        expect(result).toBe('Wiki content for Home retrieved.')
    })

    it('updateWikiTool > executes successfully', async () => {
        const result = await updateWikiTool.execute(
            { pageId: 'Home', content: 'new content' },
            mockContext
        )
        expect(result).toBe('Wiki page Home updated successfully.')
    })
})
