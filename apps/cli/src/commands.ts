import fs from 'node:fs/promises'
import path from 'node:path'

import pkg from '../package.json' with { type: 'json' }

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
    const YELLOW = '\x1b[38;2;253;224;71m'
    const RED = '\x1b[38;2;252;165;165m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const GRAY = '\x1b[38;2;161;161;170m'
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
        const versionStr = result.installedVersion ? ` to v${result.installedVersion}` : ''
        console.log(
            `\n${GREEN}✔${RESET}  ${WHITE}December CLI successfully updated${versionStr} via ${result.method}!${RESET}`
        )

        if (result.collisionFixed && result.cleanedBinaries && result.cleanedBinaries.length > 0) {
            console.log(
                `\n${GREEN}✔${RESET}  ${WHITE}Resolved ${result.cleanedBinaries.length} conflicting older binary location(s):${RESET}`
            )
            for (const b of result.cleanedBinaries) {
                console.log(`   ${GRAY}• ${b}${RESET}`)
            }
        }

        if (result.shellHashNotice) {
            console.log(
                `\n${YELLOW}ℹ${RESET}  ${GRAY}Note: If your current terminal still runs an older path, run: ${WHITE}hash -r${GRAY} (bash) or restart your terminal.${RESET}\n`
            )
        } else {
            console.log('')
        }
    } else {
        console.error(
            `\n${RED}✖${RESET}  Failed to update December CLI via ${result.method}: ${result.error || 'Unknown error'}`
        )
        console.error(`   Try running manually: ${WHITE}${result.manualCmd}${RESET}\n`)
        process.exitCode = 1
    }
}

export async function handleDoctorCommand(options?: { fix?: boolean }): Promise<void> {
    const { diagnoseBinaryCollisions, resolveAndCleanStaleBinaries } =
        await import('./utils/bin-discovery')
    const { getAuthStatus, loadConfig } = await import('./config')

    const BLUE = '\x1b[38;2;135;178;244m'
    const GREEN = '\x1b[38;2;110;231;183m'
    const YELLOW = '\x1b[38;2;253;224;71m'
    const RED = '\x1b[38;2;252;165;165m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const GRAY = '\x1b[38;2;161;161;170m'
    const RESET = '\x1b[0m'

    console.log(`\n${BLUE}✱${RESET}  ${WHITE}December CLI Health & Environment Doctor${RESET}\n`)

    // 1. Environment & Runtime
    const runtimeName =
        typeof (process as any).isBun !== 'undefined' || process.versions.bun ? 'Bun' : 'Node.js'
    const runtimeVer = (process.versions as any).bun || process.versions.node
    console.log(`${WHITE}Environment & Runtime:${RESET}`)
    console.log(`  • CLI Package Version: ${GREEN}v${pkg.version}${RESET}`)
    console.log(
        `  • Runtime:             ${GRAY}${runtimeName} v${runtimeVer} (${process.platform}-${process.arch})${RESET}`
    )
    console.log(`  • Process Executable:  ${GRAY}${process.execPath}${RESET}`)
    console.log(`  • Executing Script:    ${GRAY}${process.argv[1] || 'unknown'}${RESET}`)
    console.log('')

    // 2. Binary Installations & PATH Collisions
    console.log(`${WHITE}Installed Binaries & $PATH Precedence:${RESET}`)
    const diagnosis = await diagnoseBinaryCollisions({ argv1: process.argv[1] })

    if (diagnosis.allBinaries.length === 0) {
        console.log(`  ${YELLOW}⚠ No standalone binaries found in standard PATH entries.${RESET}`)
    } else {
        for (const bin of diagnosis.allBinaries) {
            const statusTag = bin.isActive
                ? `${GREEN}[ACTIVE]${RESET}`
                : `${YELLOW}[SHADOWED]${RESET}`
            const verStr = bin.version ? `v${bin.version}` : 'unknown'
            console.log(
                `  • ${statusTag} ${WHITE}${verStr}${RESET} (${bin.manager}) -> ${GRAY}${bin.path}${RESET}`
            )
            if (bin.isSymlink) {
                console.log(`    ${GRAY}↳ points to: ${bin.realPath}${RESET}`)
            }
        }
    }
    console.log('')

    // 3. Collision Resolution / Fix
    if (diagnosis.hasCollision) {
        if (options?.fix) {
            console.log(`${BLUE}✱${RESET}  ${WHITE}Resolving binary collisions (--fix)...${RESET}`)
            const target = diagnosis.activeBinary || diagnosis.allBinaries[0]
            if (target) {
                const fixed = await resolveAndCleanStaleBinaries(target, diagnosis.allBinaries)
                if (fixed.length > 0) {
                    console.log(
                        `  ${GREEN}✔ Forwarded ${fixed.length} shadowed binary path(s) to primary active binary (${target.path}).${RESET}`
                    )
                    console.log(
                        `  ${YELLOW}ℹ Run "hash -r" (bash) or restart your terminal to apply.${RESET}\n`
                    )
                } else {
                    console.log(`  ${GREEN}✔ All binary links are already aligned.${RESET}\n`)
                }
            }
        } else {
            console.log(
                `  ${YELLOW}⚠ Multiple installations detected!${RESET} ${GRAY}Run ${WHITE}december doctor --fix${GRAY} to auto-align stale paths.${RESET}\n`
            )
        }
    } else {
        console.log(
            `  ${GREEN}✔ No binary collisions detected. Clean single installation.${RESET}\n`
        )
    }

    // 4. Configuration & Auth
    const config = await loadConfig()
    const authStatus = await getAuthStatus()
    console.log(`${WHITE}Configuration & Authentication:${RESET}`)
    if (authStatus.hasDecember) {
        console.log(
            `  • December Cloud:      ${GREEN}Connected${RESET} ${config.email ? `(${config.email})` : ''}`
        )
    } else {
        console.log(`  • December Cloud:      ${GRAY}Not logged in${RESET} (Run "december login")`)
    }

    const providerCount = config.providers ? Object.keys(config.providers).length : 0
    if (providerCount > 0) {
        console.log(
            `  • BYOK Providers:      ${GREEN}${providerCount} configured${RESET} (Active: ${config.activeProvider || 'none'}, Model: ${config.activeModel || 'default'})`
        )
    } else {
        console.log(`  • BYOK Providers:      ${GRAY}None configured${RESET}`)
    }

    console.log(`  • Auth Priority:       ${GRAY}${config.authPriority || 'byok'}${RESET}`)
    console.log('')
}
