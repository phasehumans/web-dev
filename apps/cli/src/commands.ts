import fs from 'node:fs/promises'
import path from 'node:path'

import { loadConfig, saveConfig } from './config'

export async function handleLogoutCommand(): Promise<void> {
    const config = await loadConfig()
    delete config.decemberToken
    delete config.email
    config.providers = {}
    delete config.activeProvider
    delete config.activeModel

    await saveConfig(config)
    console.log('Logged out successfully. Stored credentials removed.')
}

const DEFAULT_AGENTS_MD = `# Agent Guidelines & Project Instructions

Add project-specific guidelines, rules, skills, testing commands, architecture patterns, and conventions in this file for December to follow.
`

const DEFAULT_COMMANDS_JSON = `{
  "commands": [
    // {
    //   "name": "test",
    //   "description": "Run tests and fix failures",
    //   "prompt": "Run 'bun test $PKG'. If any test fails, fix the root cause and verify."
    // }
  ]
}
`

const DEFAULT_MCP_JSON =
    JSON.stringify(
        {
            mcpServers: {},
        },
        null,
        2
    ) + '\n'

const DEFAULT_SETTINGS_JSON =
    JSON.stringify(
        {
            thinkingLevel: 'auto',
            steeringMode: 'all',
            followUpMode: 'all',
            toolPermission: 'always-proceed',
            pathGuard: true,
        },
        null,
        2
    ) + '\n'

export async function handleInitCommand(options?: { quiet?: boolean }): Promise<void> {
    const rootDir = process.cwd()
    const decDir = path.join(rootDir, '.december')
    await fs.mkdir(decDir, { recursive: true })

    const filesToScaffold: {
        name: string
        targetPath: string
        displayPath: string
        content: string
    }[] = [
        {
            name: 'AGENTS.md',
            targetPath: path.join(rootDir, 'AGENTS.md'),
            displayPath: 'AGENTS.md',
            content: DEFAULT_AGENTS_MD,
        },
        {
            name: 'commands.json',
            targetPath: path.join(decDir, 'commands.json'),
            displayPath: '.december/commands.json',
            content: DEFAULT_COMMANDS_JSON,
        },
        {
            name: 'mcp.json',
            targetPath: path.join(decDir, 'mcp.json'),
            displayPath: '.december/mcp.json',
            content: DEFAULT_MCP_JSON,
        },
        {
            name: 'settings.json',
            targetPath: path.join(decDir, 'settings.json'),
            displayPath: '.december/settings.json',
            content: DEFAULT_SETTINGS_JSON,
        },
    ]

    for (const file of filesToScaffold) {
        try {
            await fs.access(file.targetPath)
            if (!options?.quiet) {
                console.log(`${file.displayPath} already exists.`)
            }
        } catch {
            await fs.writeFile(file.targetPath, file.content, 'utf-8')
            if (!options?.quiet) {
                console.log(`Created ${file.displayPath}`)
            }
        }
    }

    if (!options?.quiet) {
        console.log('\nDecember project initialization complete.')
    }
}

export async function handleUpdateCommand(): Promise<void> {
    const { performCliUpdate } = await import('./utils/updater')
    const BLUE = '\x1b[38;2;135;178;244m'
    const GREEN = '\x1b[38;2;110;231;183m'
    const RED = '\x1b[38;2;252;165;165m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const RESET = '\x1b[0m'

    console.log(`\n${BLUE}✱${RESET}  ${WHITE}Checking and updating December CLI...${RESET}`)

    const result = await performCliUpdate({
        onProgress: (msg) => {
            console.log(`${BLUE}✱${RESET}  ${msg}`)
        },
    })

    if (result.method === 'source') {
        console.log(
            `\n${BLUE}✱${RESET}  Running December CLI from local source development directory.`
        )
        console.log(`   Run ${WHITE}git pull && bun install${RESET} to update.\n`)
        return
    }

    if (result.method === 'npx') {
        console.log(`\n${BLUE}✱${RESET}  Running December CLI via npx/bunx.`)
        console.log(`   Each invocation automatically pulls the latest version.\n`)
        return
    }

    if (result.success) {
        console.log(
            `\n${GREEN}✔${RESET}  ${WHITE}December CLI successfully updated via ${result.method}!${RESET}\n`
        )
    } else {
        console.error(
            `\n${RED}✖${RESET}  Failed to update December CLI via ${result.method}: ${result.error || 'Unknown error'}`
        )
        console.error(`   Try running manually: ${WHITE}${result.manualCmd}${RESET}\n`)
        process.exitCode = 1
    }
}
