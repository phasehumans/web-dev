import { describe, expect, test, mock } from 'bun:test'

import { SubagentTool } from '../../src/subagent'
import { createMockContext } from '../mock-context'

describe('SubagentTool', () => {
    test('should invoke subagent and return result', async () => {
        const context = createMockContext()
        context.spawnSubagent = mock(async () => 'Subagent found 42')

        const result = await SubagentTool.execute({ prompt: 'what is the answer' }, context)

        expect(context.spawnSubagent).toHaveBeenCalledWith('what is the answer')
        expect(result).toBe('Subagent found 42')
    })

    test('should handle subagent error', async () => {
        const context = createMockContext()
        context.spawnSubagent = mock(async () => {
            throw new Error('subagent crash')
        })

        const result = await SubagentTool.execute({ prompt: 'crash' }, context)

        expect(result).toContain('Failed to invoke subagent')
    })
})
