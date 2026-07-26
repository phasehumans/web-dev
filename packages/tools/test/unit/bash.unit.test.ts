import { describe, expect, test, mock } from 'bun:test'

import { BashTool } from '../../src/bash'
import { createMockContext } from '../helpers/mock-context'

describe('BashTool', () => {
    test('should execute a command successfully', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({ exitCode: 0, output: 'success' }))

        const result = await BashTool.execute({ command: 'echo hello' }, context)

        expect(context.operations.bash.exec).toHaveBeenCalled()
        expect(result).toContain('success')
    })

    test('should format background process output correctly', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({
            exitCode: null,
            output: '',
            taskId: 'task-123',
        }))

        const result = await BashTool.execute({ command: 'sleep 10', is_background: true }, context)

        expect(result).toContain('Task ID: task-123')
    })
})
