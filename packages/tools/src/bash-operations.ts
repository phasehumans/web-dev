import { spawn } from 'node:child_process'

const trackedDetachedChildPids = new Set<number>()

export function trackDetachedChildPid(pid: number): void {
    trackedDetachedChildPids.add(pid)
}

export function untrackDetachedChildPid(pid: number): void {
    trackedDetachedChildPids.delete(pid)
}

export function killTrackedDetachedChildren(): void {
    for (const pid of trackedDetachedChildPids) {
        killProcessTree(pid)
    }
    trackedDetachedChildPids.clear()
}

export function killProcessTree(pid: number): void {
    if (process.platform === 'win32') {
        try {
            spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
                stdio: 'ignore',
                detached: true,
                windowsHide: true,
            })
        } catch {
            // Ignore failure when killing Windows process tree
        }
    } else {
        try {
            process.kill(-pid, 'SIGKILL')
        } catch {
            // Intentionally swallowed: process group kill failed, falling back to direct PID kill
            try {
                process.kill(pid, 'SIGKILL')
            } catch {
                // Ignore process kill failure if already terminated
            }
        }
    }
}

export function createLocalBashOperations() {
    return {
        exec: async (
            command: string,
            cwd: string,
            options: {
                onData: (chunk: string | Buffer) => void
                signal?: AbortSignal
                timeout?: number
                env?: NodeJS.ProcessEnv
            }
        ) => {
            return new Promise<{ exitCode: number | null; output: string; taskId?: string }>(
                (resolve, reject) => {
                    const child = spawn(command, {
                        cwd,
                        detached: process.platform !== 'win32',
                        env: options.env ?? process.env,
                        shell: true,
                    })

                    if (child.pid) trackDetachedChildPid(child.pid)

                    let output = ''
                    const handleData = (data: Buffer) => {
                        const chunk = data.toString()
                        output += chunk
                        options.onData(chunk)
                    }

                    child.stdout?.on('data', handleData)
                    child.stderr?.on('data', handleData)

                    let timedOut = false
                    let timeoutHandle: NodeJS.Timeout | undefined

                    if (options.timeout) {
                        timeoutHandle = setTimeout(() => {
                            timedOut = true
                            if (child.pid) killProcessTree(child.pid)
                        }, options.timeout * 1000)
                    }

                    const onAbort = () => {
                        if (child.pid) killProcessTree(child.pid)
                    }

                    if (options.signal) {
                        if (options.signal.aborted) onAbort()
                        else options.signal.addEventListener('abort', onAbort, { once: true })
                    }

                    ;(child as any).on('close', (code: number | null) => {
                        if (child.pid) untrackDetachedChildPid(child.pid)
                        if (timeoutHandle) clearTimeout(timeoutHandle)
                        if (options.signal) options.signal.removeEventListener('abort', onAbort)

                        if (timedOut) {
                            return reject(new Error('timeout'))
                        }
                        if (options.signal?.aborted) {
                            return reject(new Error('aborted'))
                        }

                        resolve({ exitCode: code, output })
                    })
                }
            )
        },
    }
}
