import { spawn, ChildProcess } from 'node:child_process'

import { Tool, ToolExecuteContext, truncateOutput } from '@december/shared'
import { Type, Static } from '@sinclair/typebox'

const pythonReplSchema = Type.Object({
    code: Type.String({ description: 'Python code snippet to execute.' }),
    reset: Type.Optional(
        Type.Boolean({ description: 'Set to true to reset the stateful REPL session.' })
    ),
    timeoutSeconds: Type.Optional(
        Type.Number({ description: 'Execution timeout in seconds. Defaults to 30.' })
    ),
})

export type PythonReplInput = Static<typeof pythonReplSchema>

const PYTHON_DAEMON_SCRIPT = `
import sys, json, io, contextlib

globals_dict = {'__name__': '__main__', '__doc__': None, '__package__': None}

while True:
    line = sys.stdin.readline()
    if not line:
        break
    try:
        data = json.loads(line)
        code_str = data.get("code", "")
        
        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        
        with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
            try:
                compiled = compile(code_str, '<repl>', 'eval')
                val = eval(compiled, globals_dict)
                if val is not None:
                    print(repr(val))
            except SyntaxError:
                compiled = compile(code_str, '<repl>', 'exec')
                exec(compiled, globals_dict)

        out = stdout_buf.getvalue()
        err = stderr_buf.getvalue()
        print(json.dumps({"success": True, "output": out, "error": err}), flush=True)
    except Exception as e:
        print(json.dumps({"success": False, "output": "", "error": str(e)}), flush=True)
`

class PythonReplKernel {
    private process: ChildProcess | null = null
    private active = false

    private ensureProcess(): ChildProcess {
        if (this.process && this.active && !this.process.killed) {
            return this.process
        }

        const proc = spawn('python3', ['-u', '-c', PYTHON_DAEMON_SCRIPT], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
        })

        ;(proc as any).on('exit', () => {
            this.active = false
            this.process = null
        })

        this.process = proc
        this.active = true

        return proc
    }

    public reset(): void {
        if (this.process) {
            try {
                this.process.kill('SIGKILL')
            } catch {
                // Ignore kill errors
            }
        }
        this.process = null
        this.active = false
    }

    public async execute(code: string, timeoutSeconds: number = 30): Promise<string> {
        return new Promise<string>((resolve) => {
            let proc: ChildProcess
            try {
                proc = this.ensureProcess()
            } catch (err: any) {
                return resolve(`Error initializing Python REPL: ${err.message}`)
            }

            let responseBuffer = ''

            const onData = (data: Buffer) => {
                responseBuffer += data.toString()
                if (responseBuffer.includes('\n')) {
                    cleanup()
                    const line = responseBuffer.trim()
                    try {
                        const parsed = JSON.parse(line)
                        const out = (parsed.output || '').trim()
                        const err = (parsed.error || '').trim()

                        let res = ''
                        if (out) res += out
                        if (err) res += (res ? '\n[stderr]\n' : '') + err

                        resolve(res || 'Code executed successfully with no output.')
                    } catch (e: any) {
                        resolve(`Failed to parse REPL output: ${e.message}`)
                    }
                }
            }

            const onError = (data: Buffer) => {
                // Stderr logging if needed
            }

            const timer = setTimeout(() => {
                cleanup()
                this.reset()
                resolve(`Execution timed out after ${timeoutSeconds} seconds. REPL session reset.`)
            }, timeoutSeconds * 1000)

            const cleanup = () => {
                clearTimeout(timer)
                proc.stdout?.off('data', onData)
                proc.stderr?.off('data', onError)
            }

            proc.stdout?.on('data', onData)
            proc.stderr?.on('data', onError)

            if (!proc.stdin || proc.stdin.destroyed) {
                cleanup()
                this.reset()
                return resolve('Error: Python REPL stdin is closed. Session reset.')
            }

            const payload = JSON.stringify({ code }) + '\n'
            proc.stdin.write(payload, (err) => {
                if (err) {
                    cleanup()
                    this.reset()
                    return resolve(`Failed to write to Python REPL: ${err.message}`)
                }
            })
        })
    }
}

const globalReplKernel = new PythonReplKernel()

export const PythonReplTool: Tool<PythonReplInput> = {
    name: 'python_repl',
    description:
        'Executes Python code in an interactive stateful REPL environment. Variables, functions, and imports are preserved across calls.',
    inputSchema: pythonReplSchema,
    execute: async (
        { code, reset = false, timeoutSeconds = 30 }: PythonReplInput,
        context: ToolExecuteContext
    ) => {
        try {
            if (reset) {
                globalReplKernel.reset()
                if (!code || !code.trim()) {
                    return 'Python REPL session reset successfully.'
                }
            }

            const resultText = await globalReplKernel.execute(code, timeoutSeconds)
            return truncateOutput(resultText, 10000, 100).text
        } catch (error: any) {
            return `Python REPL execution error: ${error.message}`
        }
    },
}
