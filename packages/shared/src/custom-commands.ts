import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface CustomCommand {
    name: string
    description: string
    prompt: string
}

export interface CustomCommandsFile {
    commands: CustomCommand[]
}

export function parseJsonWithComments<T = any>(content: string): T {
    const sanitized = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .trim()
    return JSON.parse(sanitized) as T
}

export function loadCustomCommands(workspaceDir: string = process.cwd()): CustomCommand[] {
    const commandsMap = new Map<string, CustomCommand>()

    // 1. Load global commands: ~/.config/december/commands.json
    try {
        const globalPath = path.join(os.homedir(), '.config', 'december', 'commands.json')
        if (fs.existsSync(globalPath)) {
            const content = fs.readFileSync(globalPath, 'utf-8')
            const parsed = parseJsonWithComments<CustomCommandsFile>(content)
            if (Array.isArray(parsed?.commands)) {
                for (const cmd of parsed.commands) {
                    if (cmd.name && cmd.prompt) {
                        commandsMap.set(cmd.name.toLowerCase(), {
                            name: cmd.name.toLowerCase(),
                            description: cmd.description || `Execute /${cmd.name} custom command`,
                            prompt: cmd.prompt,
                        })
                    }
                }
            }
        }
    } catch {
        // Intentionally swallowed: ignore missing or unreadable global commands file
    }

    // 2. Load workspace commands: .december/commands.json (overrides global)
    try {
        const workspacePath = path.join(workspaceDir, '.december', 'commands.json')
        if (fs.existsSync(workspacePath)) {
            const content = fs.readFileSync(workspacePath, 'utf-8')
            const parsed = parseJsonWithComments<CustomCommandsFile>(content)
            if (Array.isArray(parsed?.commands)) {
                for (const cmd of parsed.commands) {
                    if (cmd.name && cmd.prompt) {
                        commandsMap.set(cmd.name.toLowerCase(), {
                            name: cmd.name.toLowerCase(),
                            description: cmd.description || `Execute /${cmd.name} custom command`,
                            prompt: cmd.prompt,
                        })
                    }
                }
            }
        }
    } catch {
        // Intentionally swallowed: ignore missing or unreadable workspace commands file
    }

    return Array.from(commandsMap.values())
}

export function interpolateCommandPrompt(promptTemplate: string, args: string[]): string {
    const fullArgs = args.join(' ').trim()
    const firstArg = args[0] || ''

    let result = promptTemplate

    // Replace $FILE, $PKG, $ARG with firstArg (or fullArgs if only 1 argument)
    result = result.replaceAll('$FILE', firstArg || fullArgs)
    result = result.replaceAll('$PKG', firstArg || fullArgs)
    result = result.replaceAll('$ARG', firstArg || fullArgs)

    // Replace $@ and $* with full arguments string
    result = result.replaceAll('$@', fullArgs)
    result = result.replaceAll('$*', fullArgs)

    // Replace positional placeholders like $1, $2, etc.
    for (let i = 0; i < 9; i++) {
        const placeholder = `$${i + 1}`
        if (result.includes(placeholder)) {
            result = result.replaceAll(placeholder, args[i] || '')
        }
    }

    // If template had no placeholder variables but arguments were passed, append arguments to prompt
    const hasVariables =
        promptTemplate.includes('$FILE') ||
        promptTemplate.includes('$PKG') ||
        promptTemplate.includes('$ARG') ||
        promptTemplate.includes('$@') ||
        promptTemplate.includes('$*') ||
        /\$[1-9]/.test(promptTemplate)

    if (!hasVariables && fullArgs) {
        result = `${result.trim()} ${fullArgs}`
    }

    return result.trim()
}
