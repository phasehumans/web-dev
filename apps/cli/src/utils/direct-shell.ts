import { spawn, type ChildProcess } from 'node:child_process'

import { taskManager } from '../task-manager'

export interface DirectShellOptions {
    timeoutMs?: number // Default: 60,000ms
    onData?: (chunk: string) => void
    onBackground?: (taskId: string) => void
}

export interface DirectShellResult {
    output: string
    exitCode: number
    isBackground: boolean
    taskId?: string
}

export function startDirectCommand(command: string, options: DirectShellOptions = {}) {
    const { timeoutMs = 60_000, onData, onBackground } = options

    let output = ''
    let isBackground = false
    let bgTaskId: string | undefined
    let isAborted = false

    const isWindows = process.platform === 'win32'
    const shellCmd = isWindows ? 'cmd.exe' : '/bin/bash'
    const shellArgs = isWindows ? ['/d', '/s', '/c', command] : ['-c', command]

    const child: ChildProcess = spawn(shellCmd, shellArgs, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: !isWindows,
    })

    let timeoutTimer: ReturnType<typeof setTimeout> | null = null

    const promise = new Promise<DirectShellResult>((resolve) => {
        child.stdout?.on('data', (data: Buffer) => {
            const str = data.toString('utf8')
            output += str
            if (isBackground && bgTaskId) {
                taskManager.appendOutput(bgTaskId, str)
            } else if (onData) {
                onData(str)
            }
        })

        child.stderr?.on('data', (data: Buffer) => {
            const str = data.toString('utf8')
            output += str
            if (isBackground && bgTaskId) {
                taskManager.appendOutput(bgTaskId, str)
            } else if (onData) {
                onData(str)
            }
        })
        ;(child as any).on('error', (err: any) => {
            const errStr = `\nFailed to start process: ${err?.message || err}\n`
            output += errStr
            if (onData) onData(errStr)
            if (timeoutTimer) clearTimeout(timeoutTimer)
            resolve({
                output,
                exitCode: 1,
                isBackground,
                taskId: bgTaskId,
            })
        })
        ;(child as any).on('close', (code: any) => {
            if (timeoutTimer) clearTimeout(timeoutTimer)
            const finalCode = isAborted ? 130 : (code ?? 0)
            if (isBackground && bgTaskId) {
                taskManager.markCompleted(bgTaskId, finalCode)
            } else {
                resolve({
                    output,
                    exitCode: finalCode,
                    isBackground: false,
                })
            }
        })

        if (timeoutMs > 0 && timeoutMs < Infinity) {
            timeoutTimer = setTimeout(() => {
                isBackground = true
                const task = taskManager.addTask(command, child)
                bgTaskId = task.id
                if (output) {
                    taskManager.appendOutput(task.id, output)
                }
                if (onBackground) {
                    onBackground(task.id)
                }
                resolve({
                    output,
                    exitCode: 0,
                    isBackground: true,
                    taskId: task.id,
                })
            }, timeoutMs)
        }
    })

    const abort = () => {
        isAborted = true
        if (timeoutTimer) clearTimeout(timeoutTimer)
        if (isBackground && bgTaskId) {
            taskManager.killTask(bgTaskId)
        } else {
            try {
                if (child.pid) {
                    if (process.platform !== 'win32') {
                        process.kill(-child.pid, 'SIGINT')
                    } else {
                        child.kill('SIGINT')
                    }
                } else {
                    child.kill()
                }
            } catch {
                try {
                    child.kill()
                } catch {
                    // Intentionally swallowed: ignore process kill error if already exited
                }
            }
        }
    }

    return { promise, abort, child }
}

export async function runDirectCommand(
    command: string,
    options: DirectShellOptions = {}
): Promise<DirectShellResult> {
    const { promise } = startDirectCommand(command, options)
    return promise
}

runDirectCommand.start = startDirectCommand
