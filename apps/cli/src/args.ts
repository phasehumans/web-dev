import { parseArgs } from 'node:util'

export interface ParsedCliArgs {
    command?: string
    prompt?: string
    isHelp: boolean
    isVersion: boolean
    yes: boolean
    json: boolean
    fix: boolean
    force: boolean
    isGlobal: boolean
    isLocal: boolean
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
                force: { type: 'boolean', short: 'f' },
                global: { type: 'boolean', short: 'g' },
                local: { type: 'boolean', short: 'l' },
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
        const force = Boolean(values.force)
        const isGlobal = Boolean(values.global)
        const isLocal = Boolean(values.local)
        const model = values.model as string | undefined
        const provider = values.provider as string | undefined
        const sessionId = values['session-id'] as string | undefined
        const scope = values.scope as string | undefined
        const cwd = values.cwd as string | undefined

        const knownCommands = [
            'login',
            'logout',
            'init',
            'update',
            'doctor',
            'auth',
            'link',
            'key',
            'skill',
            'skills',
        ]
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
            force,
            isGlobal,
            isLocal,
            model,
            provider,
            sessionId,
            scope,
            cwd,
            positionals,
        }
    } catch {
        // Intentionally swallowed: return default args on parse failure
        return {
            isHelp: false,
            isVersion: false,
            yes: false,
            json: false,
            fix: false,
            force: false,
            isGlobal: false,
            isLocal: false,
            positionals: [],
        }
    }
}

export function getHelpText(version: string = '0.0.0'): string {
    return `December CLI v${version}
a coding agent that lives in your terminal.

Usage:
  december                          Launch interactive TUI session
  december "<prompt>"               Execute headless agent task
  december skill <action>           Manage modular skills (list, create, info, add, remove)
  december auth [status|import]     Inspect active subscriptions and authentication status
  december link <provider>          Link AI subscription (copilot, claude, chatgpt, gemini)
  december key <provider> [key]     Save BYOK API key (openai, anthropic, openrouter, etc.)
  december login [provider]         Log in to December Cloud or subscription
  december logout [provider]        Remove saved authentication credentials
  december init                     Initialize local .december configuration
  december update                   Update December CLI to the latest version
  december doctor [--fix]           Inspect installations, health, and resolve PATH collisions

Options:
  -h, --help                        Show CLI help and exit
  -v, --version                     Show CLI version and exit
  -y, --yes                         Auto-approve tool permissions (non-interactive mode)
  -g, --global                      Apply skill actions to user global configuration (~/.config/december) [default]
  -l, --local                       Apply skill actions to current project/workspace (.agents/skills)
  --json                            Output structured JSON events
  --fix                             Automatically fix detected PATH collisions and stale links
  -m, --model <model>               Override target LLM model
  -p, --provider <provider>         Override target LLM provider
  --session-id <id>                 Specify session ID
  --scope <dir>                     Confine agent searches and tools to a specific subpackage
  --cwd <dir>                       Set the working directory root
`
}
