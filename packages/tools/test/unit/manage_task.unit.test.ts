import { describe, expect, test, mock } from 'bun:test'

import { ManageTaskTool } from '../../src/manage_task'
import { createMockContext } from '../mock-context'

describe('ManageTaskTool (Unit)', () => {
    test('should get task status successfully', async () => {
        const context = createMockContext()
        context.operations.bash.getTaskStatus = mock(async (id: string) => ({
            status: 'running',
            output: `Output for ${id}`,
        }))

        const result = await ManageTaskTool.execute({ action: 'status', taskId: 't-1' }, context)
        expect(context.operations.bash.getTaskStatus).toHaveBeenCalledWith('t-1')
        expect(result).toContain('Task [t-1] is currently: running')
        expect(result).toContain('Output for t-1')
    })

    test('should handle status error gracefully', async () => {
        const context = createMockContext()
        context.operations.bash.getTaskStatus = mock(async () => {
            throw new Error('Task not found')
        })

        const result = await ManageTaskTool.execute({ action: 'status', taskId: 'bad-id' }, context)
        expect(result).toBe('Error: Task not found')
    })

    test('should kill task successfully', async () => {
        const context = createMockContext()
        context.operations.bash.killTask = mock(async () => true)

        const result = await ManageTaskTool.execute({ action: 'kill', taskId: 't-1' }, context)
        expect(context.operations.bash.killTask).toHaveBeenCalledWith('t-1')
        expect(result).toBe('Successfully killed task [t-1].')
    })

    test('should handle unkillable or finished task gracefully', async () => {
        const context = createMockContext()
        context.operations.bash.killTask = mock(async () => false)

        const result = await ManageTaskTool.execute({ action: 'kill', taskId: 't-dead' }, context)
        expect(result).toBe('Task [t-dead] is either not running or could not be killed.')
    })

    test('should return error if task operations are unsupported in environment', async () => {
        const context = createMockContext()
        delete context.operations.bash.getTaskStatus
        delete context.operations.bash.killTask

        const statusRes = await ManageTaskTool.execute({ action: 'status', taskId: 't-1' }, context)
        expect(statusRes).toContain('Error: Task management is not supported')

        const killRes = await ManageTaskTool.execute({ action: 'kill', taskId: 't-1' }, context)
        expect(killRes).toContain('Error: Task management is not supported')
    })
})
