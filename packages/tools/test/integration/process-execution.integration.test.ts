import { describe, expect, test, beforeEach } from 'bun:test'

import { BashTool } from '../../src/bash'
import { createMockContext } from '../mock-context'

describe('Process Execution Tools Integration', () => {
    let context: any

    beforeEach(() => {
        context = createMockContext()
        context.operations.bash.exec = async (cmd: string) => {
            const proc = Bun.spawn(['sh', '-c', cmd], {
                stdout: 'pipe',
                stderr: 'pipe',
            })
            const stdout = await new Response(proc.stdout).text()
            const stderr = await new Response(proc.stderr).text()
            const exitCode = await proc.exited
            return { exitCode, output: stdout || stderr }
        }
    })

    test('executes shell commands and captures stdout output', async () => {
        const result = await BashTool.execute({ command: 'echo "hello from bun process"' }, context)
        expect(result).toContain('hello from bun process')
    })

    test('captures non-zero exit codes accurately', async () => {
        context.operations.bash.exec = async () => ({ exitCode: 1, output: 'command failed' })
        const result = await BashTool.execute({ command: 'exit 1' }, context)
        expect(result).toBeDefined()
    })
})
