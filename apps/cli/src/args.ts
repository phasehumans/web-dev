import { parseArgs } from 'node:util'

export interface ParsedCliArgs {
    command?: string
    prompt?: string
    isHelp: boolean
    isVersion: boolean
    yes: boolean
    json: boolean
    fix: boolean
    model?: string
    provider?: string
    sessionId?: string
    scope?: string
    cwd?: string
    positionals: string[]
}

export function parseCliArgs(args: string[]): ParsedCliArgs {
    try {
        const { values, positionals } = parseArgs({
            args,
            options: {
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' },
                yes: { type: 'boolean', short: 'y' },
                json: { type: 'boolean' },
                fix: { type: 'boolean' },
                model: { type: 'string', short: 'm' },
                provider: { type: 'string', short: 'p' },
                'session-id': { type: 'string' },
                scope: { type: 'string' },
                cwd: { type: 'string' },
            },
            allowPositionals: true,
            strict: false,
        })

        const isHelp = Boolean(values.help)
        const isVersion = Boolean(values.version)
        const yes = Boolean(values.yes)
        const json = Boolean(values.json)
        const fix = Boolean(values.fix)
        const model = values.model as string | undefined
        const provider = values.provider as string | undefined
        const sessionId = values['session-id'] as string | undefined
        const scope = values.scope as string | undefined
        const cwd = values.cwd as string | undefined

        const knownCommands = ['login', 'logout', 'init', 'update', 'doctor']
        let command: string | undefined
        let prompt: string | undefined

        if (positionals.length > 0) {
            const firstPositional = positionals[0]
            if (knownCommands.includes(firstPositional)) {
                command = firstPositional
            } else {
                prompt = positionals.join(' ')
            }
        }

        return {
            command,
            prompt,
            isHelp,
            isVersion,
            yes,
            json,
            fix,
            model,
            provider,
            sessionId,
            scope,
            cwd,
            positionals,
        }
    } catch {
        return {
            isHelp: false,
            isVersion: false,
            yes: false,
            json: false,
            fix: false,
            positionals: [],
        }
    }
}

export function getHelpText(version: string = '0.0.0'): string {
    return `December CLI v${version}
AI coding agent that lives in your terminal.

Usage:
  december                          Launch interactive TUI session
  december "<prompt>"               Execute headless agent task
  december login                    Log in to December (via Device Code)
  december logout                   Remove saved authentication credentials
  december init                     Initialize local .december configuration
  december update                   Update December CLI to the latest version
  december doctor [--fix]           Inspect installations, health, and resolve PATH collisions

Options:
  -h, --help                        Show CLI help and exit
  -v, --version                     Show CLI version and exit
  -y, --yes                         Auto-approve tool permissions (non-interactive mode)
  --json                            Output structured JSON events
  --fix                             Automatically fix detected PATH collisions and stale links
  -m, --model <model>               Override target LLM model
  -p, --provider <provider>         Override target LLM provider
  --session-id <id>                 Specify session ID
  --scope <dir>                     Confine agent searches and tools to a specific subpackage
  --cwd <dir>                       Set the working directory root
`
}
