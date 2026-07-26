import { describe, expect, test } from 'bun:test'

import { ManageTaskTool } from '../../src/manage_task'
import { createMockContext } from '../mock-context'

describe('ManageTaskTool', () => {
    test('should get task status successfully', async () => {
        const context = createMockContext()

        const result = await ManageTaskTool.execute({ action: 'status', taskId: '123' }, context)

        expect(context.operations.bash.getTaskStatus).toHaveBeenCalledWith('123')
        expect(result).toContain('Task [123] is currently: running')
    })

    test('should kill task successfully', async () => {
        const context = createMockContext()

        const result = await ManageTaskTool.execute({ action: 'kill', taskId: '123' }, context)

        expect(context.operations.bash.killTask).toHaveBeenCalledWith('123')
        expect(result).toContain('Successfully killed task [123]')
    })
})
