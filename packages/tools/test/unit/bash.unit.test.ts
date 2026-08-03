import { describe, expect, test, mock } from 'bun:test'

import { BashTool } from '../../src/bash'
import { createMockContext } from '../mock-context'

describe('BashTool (Unit)', () => {
    test('should execute a command successfully', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({
            exitCode: 0,
            output: 'stdout text',
        }))

        const result = await BashTool.execute({ command: 'echo hello' }, context)
        expect(context.operations.bash.exec).toHaveBeenCalledWith(
            'echo hello',
            '/mock/cwd',
            expect.any(Object)
        )
        expect(result).toBe('stdout text')
    })

    test('should return default message when command succeeds with no output', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({
            exitCode: 0,
            output: '',
        }))

        const result = await BashTool.execute({ command: 'true' }, context)
        expect(result).toBe('Command executed successfully with no output.')
    })

    test('should format failed non-zero exit code command output', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({
            exitCode: 1,
            output: 'Error: file not found',
        }))

        const result = await BashTool.execute({ command: 'ls /nonexistent' }, context)
        expect(result).toContain('Command failed with exit code 1:')
        expect(result).toContain('Error: file not found')
    })

    test('should format background task process output correctly when exitCode is null', async () => {
        const context = createMockContext()
        context.operations.bash.exec = mock(async () => ({
            exitCode: null,
            output: 'Starting dev server...',
            taskId: 'task-12345',
        }))

        const result = await BashTool.execute({ command: 'npm run dev' }, context)
        expect(result).toContain('[Auto-Backgrounded] Task ID: task-12345')
        expect(result).toContain('Command is still running in the background')
        expect(result).toContain('Starting dev server...')
    })

    test('should invoke onStream callback when chunk data arrives', async () => {
        const context = createMockContext()
        let capturedOnData: any = null
        context.operations.bash.exec = mock(async (_cmd, _cwd, options: any) => {
            capturedOnData = options.onData
            return { exitCode: 0, output: 'done' }
        })

        await BashTool.execute({ command: 'echo streaming' }, context)
        expect(capturedOnData).toBeDefined()
        capturedOnData(Buffer.from('stream chunk'))
        expect(context.onStream).toHaveBeenCalledWith('stream chunk')
    })
})
