import * as cp from 'node:child_process'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
    trackDetachedChildPid,
    untrackDetachedChildPid,
    killTrackedDetachedChildren,
    killProcessTree,
    createLocalBashOperations,
} from '../../src/bash-operations'

vi.mock('node:child_process', () => ({
    spawn: vi.fn(),
}))

describe('bash-operations', () => {
    let mockChild: any

    beforeEach(() => {
        vi.clearAllMocks()
        killTrackedDetachedChildren() // clear set
        mockChild = {
            pid: 12345,
            stdout: { on: vi.fn() },
            stderr: { on: vi.fn() },
            on: vi.fn(),
            kill: vi.fn(),
        }
        ;(cp.spawn as any).mockReturnValue(mockChild)

        // Mock process.kill to not actually kill things during tests
        vi.spyOn(process, 'kill').mockImplementation(() => true)
    })

    it('should track and untrack detached children', () => {
        trackDetachedChildPid(111)
        trackDetachedChildPid(222)
        untrackDetachedChildPid(111)
        killTrackedDetachedChildren()

        // it should have killed 222 but not 111
        expect(process.kill).toHaveBeenCalledWith(-222, 'SIGKILL')
        expect(process.kill).not.toHaveBeenCalledWith(-111, 'SIGKILL')
    })

    it('should fall back to regular kill if tree kill fails', () => {
        vi.spyOn(process, 'kill').mockImplementationOnce(() => {
            throw new Error('tree kill failed')
        })
        killProcessTree(999)
        expect(process.kill).toHaveBeenNthCalledWith(1, -999, 'SIGKILL')
        expect(process.kill).toHaveBeenNthCalledWith(2, 999, 'SIGKILL')
    })

    it('createLocalBashOperations > exec executes successfully', async () => {
        const ops = createLocalBashOperations()

        const execPromise = ops.exec('echo hello', '/mock/cwd', {
            onData: vi.fn(),
        })

        // simulate child close
        const onHandler = mockChild.on.mock.calls.find((c: any) => c[0] === 'close')[1]
        onHandler(0)

        const result = await execPromise
        expect(result.exitCode).toBe(0)
        expect(cp.spawn).toHaveBeenCalledWith(
            'echo hello',
            expect.objectContaining({
                cwd: '/mock/cwd',
                shell: true,
            })
        )
    })

    it('createLocalBashOperations > exec handles timeout', async () => {
        vi.useFakeTimers()
        const ops = createLocalBashOperations()

        const execPromise = ops.exec('sleep 10', '/mock/cwd', {
            onData: vi.fn(),
            timeout: 5,
        })

        vi.advanceTimersByTime(5000)

        // simulate child close after kill
        const onHandler = mockChild.on.mock.calls.find((c: any) => c[0] === 'close')[1]
        onHandler(null)

        await expect(execPromise).rejects.toThrow('timeout')
        expect(process.kill).toHaveBeenCalledWith(-12345, 'SIGKILL')

        vi.useRealTimers()
    })

    it('createLocalBashOperations > exec handles abort signal', async () => {
        const ops = createLocalBashOperations()
        const abortController = new AbortController()

        const execPromise = ops.exec('sleep 10', '/mock/cwd', {
            onData: vi.fn(),
            signal: abortController.signal,
        })

        abortController.abort()

        // simulate child close after abort
        const onHandler = mockChild.on.mock.calls.find((c: any) => c[0] === 'close')[1]
        onHandler(null)

        await expect(execPromise).rejects.toThrow('aborted')
        expect(process.kill).toHaveBeenCalledWith(-12345, 'SIGKILL')
    })
})
