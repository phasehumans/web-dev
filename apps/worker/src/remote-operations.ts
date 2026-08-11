import { PlatformAdapter } from '@december/agent'

import { executeCommand } from './runtime'

const escapeShellArg = (arg: string): string => {
    return `'${arg.replace(/'/g, "'\\''")}'`
}

export class RemotePlatformAdapter implements PlatformAdapter {
    constructor(private vmId: string) {}

    bash = {
        exec: async (command: string, onData?: (chunk: string) => void) => {
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
            const { exitCode, output } = await this.bash.exec(`cat ${escapeShellArg(filepath)}`)
            if (exitCode !== 0) throw new Error(`Failed to read file ${filepath}: ${output}`)
            return output
        },
        writeFile: async (filepath: string, content: string) => {
            const base64Content = Buffer.from(content).toString('base64')
            await this.bash.exec(`mkdir -p "$(dirname ${escapeShellArg(filepath)})"`)
            const { exitCode, output } = await this.bash.exec(
                `echo ${escapeShellArg(base64Content)} | base64 -d > ${escapeShellArg(filepath)}`
            )
            if (exitCode !== 0) throw new Error(`Failed to write file ${filepath}: ${output}`)
        },
        readdir: async (dirPath: string) => {
            const { exitCode, output } = await this.bash.exec(`ls -1p ${escapeShellArg(dirPath)}`)
            if (exitCode !== 0) throw new Error(`Failed to read dir ${dirPath}: ${output}`)
            return output
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                    const isDir = line.endsWith('/')
                    return `[${isDir ? 'DIR ' : 'FILE'}] ${line.replace(/\/$/, '')}`
                })
        },
        mkdir: async (dirPath: string, options?: { recursive?: boolean }) => {
            const flag = options?.recursive ? '-p ' : ''
            const { exitCode, output } = await this.bash.exec(
                `mkdir ${flag}${escapeShellArg(dirPath)}`
            )
            if (exitCode !== 0) throw new Error(`Failed to mkdir ${dirPath}: ${output}`)
        },
        exists: async (filepath: string) => {
            const { exitCode } = await this.bash.exec(`test -e ${escapeShellArg(filepath)}`)
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
        askQuestion: async (question: string) => {
            return { answer: 'Non-interactive mode: auto-proceeding' }
        },
        requestPermission: async () => {
            return { block: false }
        },
    }
}
