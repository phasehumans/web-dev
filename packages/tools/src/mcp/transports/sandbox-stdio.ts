import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

export interface SandboxStdioTransportOptions {
    command: string
    args?: string[]
    env?: Record<string, string>
    operations: any
    workspaceDir?: string
}

export class SandboxStdioTransport {
    private options: SandboxStdioTransportOptions
    private buffer = ''
    private taskId?: string
    private isStarted = false
    private isClosed = false

    public onmessage?: (message: JSONRPCMessage) => void
    public onerror?: (error: Error) => void
    public onclose?: () => void

    constructor(options: SandboxStdioTransportOptions) {
        this.options = options
    }

    public async start(): Promise<void> {
        if (this.isStarted) return
        this.isStarted = true

        const { command, args = [], env = {}, operations, workspaceDir } = this.options

        // Construct command line with environment and args
        const envPrefix = Object.entries(env)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(' ')

        const fullArgs = args.map((a) => JSON.stringify(a)).join(' ')
        const commandLine = [
            workspaceDir ? `cd ${JSON.stringify(workspaceDir)} &&` : '',
            envPrefix ? `${envPrefix} ` : '',
            command,
            fullArgs,
        ]
            .filter(Boolean)
            .join(' ')

        try {
            const execResult = await operations.bash.exec(commandLine, (chunk: string) => {
                this.handleDataChunk(chunk)
            })

            if (execResult?.taskId) {
                this.taskId = execResult.taskId
            }
        } catch (err: any) {
            this.onerror?.(err)
            throw err
        }
    }

    private handleDataChunk(chunk: string): void {
        this.buffer += chunk
        const lines = this.buffer.split('\n')
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
                const parsed = JSON.parse(trimmed) as JSONRPCMessage
                this.onmessage?.(parsed)
            } catch (err) {
                // Ignore non-json or malformed stdout noise
            }
        }
    }

    public async send(message: JSONRPCMessage): Promise<void> {
        if (this.isClosed) {
            throw new Error('Cannot send message: SandboxStdioTransport is closed')
        }

        const serialized = JSON.stringify(message) + '\n'

        // If operations supports sending input to a background task / process
        if (this.options.operations.bash.sendInput && this.taskId) {
            await this.options.operations.bash.sendInput(this.taskId, serialized)
        }
    }

    public async close(): Promise<void> {
        if (this.isClosed) return
        this.isClosed = true

        if (this.taskId && this.options.operations.bash.killTask) {
            try {
                await this.options.operations.bash.killTask(this.taskId)
            } catch {
                // Intentionally swallowed: cleanup on close
            }
        }

        this.onclose?.()
    }
}
