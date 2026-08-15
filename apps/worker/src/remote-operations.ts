import { PlatformAdapter } from '@december/agent'

import { executeCommand } from './runtime'

const escapeShellArg = (arg: string): string => {
    return `'${arg.replace(/'/g, "'\\''")}'`
}

const resolveWorkspacePath = (rawPath: string): string => {
    const trimmed = rawPath.trim()
    if (!trimmed || trimmed === '.' || trimmed === './') return '/workspace'
    if (trimmed.startsWith('/workspace')) return trimmed
    const stripped = trimmed.replace(/^\/+/, '')
    if (stripped.startsWith('workspace/')) return `/${stripped}`
    return `/workspace/${stripped}`
}

export class RemotePlatformAdapter implements PlatformAdapter {
    private modifiedFiles: Record<string, string> = {}

    constructor(private vmId: string) {}

    getModifiedFiles(): Record<string, string> {
        return { ...this.modifiedFiles }
    }

    clearModifiedFiles(): void {
        this.modifiedFiles = {}
    }

    bash = {
        exec: async (command: string, onData?: (chunk: string) => void) => {
            console.log(`[AGENT REMOTE TOOL] VM '${this.vmId}' executing command: ${command}`)
            let output = ''
            const exitCode = await executeCommand(this.vmId, command, (chunk) => {
                output += chunk
                if (onData) onData(chunk)
            })
            return { exitCode, output }
        },
        getTaskStatus: async () => ({
            status: 'completed',
            output: 'Task status managed via sandbox process',
        }),
        killTask: async () => false,
    }

    fs = {
        readFile: async (filepath: string) => {
            const targetPath = resolveWorkspacePath(filepath)
            console.log(`[AGENT REMOTE TOOL] VM '${this.vmId}' reading file: ${targetPath}`)
            const { exitCode, output } = await this.bash.exec(`cat ${escapeShellArg(targetPath)}`)
            if (exitCode !== 0) throw new Error(`Failed to read file ${targetPath}: ${output}`)
            return output
        },
        writeFile: async (filepath: string, content: string) => {
            const targetPath = resolveWorkspacePath(filepath)
            console.log(
                `[AGENT REMOTE TOOL] VM '${this.vmId}' writing file: ${targetPath} (${content.length} bytes)`
            )
            const base64Content = Buffer.from(content).toString('base64')
            await this.bash.exec(`mkdir -p "$(dirname ${escapeShellArg(targetPath)})"`)
            const { exitCode, output } = await this.bash.exec(
                `echo ${escapeShellArg(base64Content)} | base64 -d > ${escapeShellArg(targetPath)}`
            )
            if (exitCode !== 0) throw new Error(`Failed to write file ${targetPath}: ${output}`)

            const relPath = targetPath.startsWith('/workspace/')
                ? targetPath.replace('/workspace/', '')
                : targetPath.replace(/^\//, '')
            this.modifiedFiles[relPath] = content
        },
        readdir: async (dirPath: string) => {
            const targetPath = resolveWorkspacePath(dirPath)
            const { exitCode, output } = await this.bash.exec(
                `ls -1p ${escapeShellArg(targetPath)}`
            )
            if (exitCode !== 0) throw new Error(`Failed to read dir ${targetPath}: ${output}`)
            return output
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                    const isDir = line.endsWith('/')
                    return `[${isDir ? 'DIR ' : 'FILE'}] ${line.replace(/\/$/, '')}`
                })
        },
        mkdir: async (dirPath: string, options?: { recursive?: boolean }) => {
            const targetPath = resolveWorkspacePath(dirPath)
            const flag = options?.recursive ? '-p ' : ''
            const { exitCode, output } = await this.bash.exec(
                `mkdir ${flag}${escapeShellArg(targetPath)}`
            )
            if (exitCode !== 0) throw new Error(`Failed to mkdir ${targetPath}: ${output}`)
        },
        exists: async (filepath: string) => {
            const targetPath = resolveWorkspacePath(filepath)
            const { exitCode } = await this.bash.exec(`test -e ${escapeShellArg(targetPath)}`)
            return exitCode === 0
        },
    }

    search = {
        find: async (dirPath: string, query: string) => {
            const { output } = await this.bash.exec(
                `find ${escapeShellArg(dirPath)} -name ${escapeShellArg(query)}`
            )
            return output
        },
        grep: async (dirPath: string, query: string) => {
            const { output } = await this.bash.exec(
                `grep -rnI ${escapeShellArg(query)} ${escapeShellArg(dirPath)}`
            )
            return output
        },
    }

    env = {
        cwd: () => '/workspace',
        get: (key: string) => undefined,
    }

    ui = {
        askQuestion: async (
            questions: Array<{ question: string; options: string[]; is_multi_select?: boolean }>
        ) => {
            return 'Non-interactive mode: auto-proceeding'
        },
        requestPermission: async () => {
            return { block: false }
        },
    }
}
