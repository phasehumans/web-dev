import { describe, it, expect } from 'bun:test'

import { taskManager } from '../src/task-manager'
import { runDirectCommand } from '../src/utils/direct-shell'

describe('Direct Shell Runner (Unit)', () => {
    it('executes simple shell command successfully with stdout', async () => {
        let output = ''
        const result = await runDirectCommand('echo "hello world"', {
            onData: (chunk) => {
                output += chunk
            },
        })

        expect(result.exitCode).toBe(0)
        expect(result.isBackground).toBe(false)
        expect(result.output).toContain('hello world')
        expect(output).toContain('hello world')
    })

    it('captures non-zero exit codes from failed shell commands', async () => {
        const result = await runDirectCommand('ls /nonexistent-dir-for-test-987654321', {})
        expect(result.exitCode).not.toBe(0)
        expect(result.isBackground).toBe(false)
    })

    it('allows aborting a running shell process', async () => {
        const { promise, abort } = runDirectCommand.start('sleep 10', {})
        setTimeout(() => {
            abort()
        }, 50)

        const result = await promise
        expect(result.exitCode).not.toBe(0)
    })

    it('transitions to background task when exceeding timeout', async () => {
        let bgTaskId = ''
        const result = await runDirectCommand('sleep 2', {
            timeoutMs: 100, // Short timeout for test
            onBackground: (taskId) => {
                bgTaskId = taskId
            },
        })

        expect(result.isBackground).toBe(true)
        expect(result.taskId).toBeDefined()
        expect(bgTaskId).toBe(result.taskId!)

        const task = taskManager.getTask(result.taskId!)
        expect(task).toBeDefined()
        expect(task?.command).toBe('sleep 2')

        // Clean up task
        taskManager.killTask(result.taskId!)
    })
})
