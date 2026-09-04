import fs from 'node:fs/promises'
import path from 'node:path'

import pkg from '../package.json' with { type: 'json' }

import { loadConfig, saveConfig } from './config'

export async function handleLogoutCommand(options?: { provider?: string }): Promise<void> {
    const config = await loadConfig()
    const targetProvider = options?.provider?.toLowerCase().trim()

    if (targetProvider) {
        let removed = false
        if (config.subscriptions && config.subscriptions[targetProvider]) {
            delete config.subscriptions[targetProvider]
            removed = true
        }
        if (config.providers && config.providers[targetProvider]) {
            delete config.providers[targetProvider]
            removed = true
        }
        if (targetProvider === 'december' && config.decemberToken) {
            delete config.decemberToken
            delete config.email
            removed = true
        }
        if (config.activeProvider === targetProvider) {
            delete config.activeProvider
            delete config.activeModel
        }
        await saveConfig(config)
        if (removed) {
            console.log(`Logged out of ${targetProvider} successfully. Stored credentials removed.`)
        } else {
            console.log(`No active credentials found for ${targetProvider}.`)
        }
        return
    }

    delete config.decemberToken
    delete config.email
    config.providers = {}
    config.subscriptions = {}
    delete config.activeProvider
    delete config.activeModel

    await saveConfig(config)
    console.log('Logged out successfully. Stored credentials removed.')
}

export async function handleAuthCommand(options?: { action?: string }): Promise<void> {
    const BLUE = '\x1b[38;2;135;178;244m'
    const GREEN = '\x1b[38;2;110;231;183m'
    const YELLOW = '\x1b[38;2;253;224;71m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const GRAY = '\x1b[38;2;161;161;170m'
    const RESET = '\x1b[0m'

    const action = (options?.action || 'status').toLowerCase().trim()

    if (action === 'import') {
        console.log(
            `\n${BLUE}✱${RESET}  ${WHITE}Scanning local environment for subscription credentials...${RESET}\n`
        )
        const { importLocalSubscriptions } =
            await import('./auth/subscriptions/subscription-manager')
        const result = await importLocalSubscriptions()

        if (result.imported.length === 0) {
            console.log(
                `  ${YELLOW}ℹ No local subscription credentials found in standard CLI directories (~/.claude, ~/.codex, ~/.config/github-copilot, Google ADC).${RESET}`
            )
            console.log(
                `    ${GRAY}Run ${WHITE}december login <provider>${GRAY} to authenticate directly via OAuth.${RESET}\n`
            )
            return
        }

        console.log(
            `  ${GREEN}Successfully detected and imported ${result.imported.length} subscription credential(s):${RESET}\n`
        )
        for (const [provider, bundle] of Object.entries(result.bundles)) {
            const typeStr = bundle.subscriptionType ? ` (${bundle.subscriptionType})` : ''
            const userStr =
                bundle.email || bundle.accountName ? ` - ${bundle.email || bundle.accountName}` : ''
            console.log(
                `  • ${WHITE}${provider.toUpperCase()}${RESET}${typeStr}${GRAY}${userStr}${RESET}`
            )
            if (bundle.expiresAt) {
                const expDate = new Date(bundle.expiresAt).toLocaleDateString()
                console.log(`    ${GRAY}↳ Expires: ${expDate}${RESET}`)
            }
        }
        console.log(
            `\n  ${GREEN}Active subscriptions are now available for agent execution!${RESET}\n`
        )
        return
    }

    // Default: status
    const config = await loadConfig()
    const { getAuthStatus } = await import('./config')
    const authStatus = await getAuthStatus()

    console.log(
        `\n${BLUE}✱${RESET}  ${WHITE}December CLI Authentication & Subscription Status${RESET}\n`
    )

    // Subscriptions
    const subKeys = config.subscriptions ? Object.keys(config.subscriptions) : []
    console.log(`${WHITE}Subscriptions:${RESET}`)
    if (subKeys.length > 0) {
        for (const k of subKeys) {
            const sub = config.subscriptions![k]
            const typeStr = sub.subscriptionType ? ` [${sub.subscriptionType}]` : ''
            const userStr = sub.email || sub.accountName ? ` (${sub.email || sub.accountName})` : ''
            const expStr = sub.expiresAt
                ? sub.expiresAt > Date.now()
                    ? `${GREEN}Valid${RESET}`
                    : `${YELLOW}Expired (will auto-refresh)${RESET}`
                : `${GREEN}Active${RESET}`
            console.log(`  • ${WHITE}${k.toUpperCase()}${RESET}${typeStr}${userStr}: ${expStr}`)
        }
    } else {
        console.log(
            `  ${GRAY}No subscriptions configured.${RESET} (Run ${WHITE}december auth import${RESET} or ${WHITE}december login <provider>${RESET})`
        )
    }
    console.log('')

    // BYOK
    const byokKeys = config.providers ? Object.keys(config.providers) : []
    console.log(`${WHITE}BYOK API Keys:${RESET}`)
    if (byokKeys.length > 0) {
        for (const k of byokKeys) {
            console.log(`  • ${WHITE}${k.toUpperCase()}${RESET}`)
        }
    } else {
        console.log(`  ${GRAY}No BYOK API keys saved in config.${RESET}`)
    }
    console.log('')

    // December Cloud
    console.log(`${WHITE}December Cloud Wallet:${RESET}`)
    if (config.decemberToken) {
        console.log(`  • ${GREEN}Connected${RESET} ${config.email ? `(${config.email})` : ''}`)
    } else {
        console.log(`  ${GRAY}Not connected.${RESET}`)
    }
    console.log('')

    console.log(
        `${WHITE}Active Auth Priority:${RESET} ${GREEN}${config.authPriority || authStatus.authPriority}${RESET}`
    )
    console.log(
        `${WHITE}Active Provider:${RESET}      ${GREEN}${config.activeProvider || 'none'}${RESET} (Model: ${config.activeModel || 'default'})\n`
    )
}

export async function handleLinkCommand(options?: { provider?: string }): Promise<void> {
    const targetProvider = (options?.provider || '').toLowerCase().trim()
    const BLUE = '\x1b[38;2;135;178;244m'
    const GREEN = '\x1b[38;2;110;231;183m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const RESET = '\x1b[0m'

    if (!targetProvider) {
        console.log(
            `\n${BLUE}✱${RESET}  ${WHITE}Link an AI Subscription (Flat-rate / OAuth)${RESET}`
        )
        console.log(`\nUsage: ${GREEN}december link <provider>${RESET}`)
        console.log(`\nSupported Providers:`)
        console.log(`  • ${WHITE}claude${RESET}    - Anthropic (Claude)`)
        console.log(`  • ${WHITE}copilot${RESET}   - GitHub (Copilot)`)
        console.log(`  • ${WHITE}gemini${RESET}    - Google (Gemini / Antigravity)`)
        console.log(`  • ${WHITE}chatgpt${RESET}   - OpenAI (ChatGPT)\n`)
        return
    }

    return handleLoginCommand({ provider: targetProvider })
}

export async function handleKeyCommand(options?: {
    provider?: string
    key?: string
}): Promise<void> {
    const provider = (options?.provider || '').toLowerCase().trim()
    const key = options?.key?.trim()
    const BLUE = '\x1b[38;2;135;178;244m'
    const GREEN = '\x1b[38;2;110;231;183m'
    const WHITE = '\x1b[38;2;244;244;245m'
    const RESET = '\x1b[0m'

    if (!provider) {
        console.log(
            `\n${BLUE}✱${RESET}  ${WHITE}Save a BYOK (Bring Your Own Key) API Provider${RESET}`
        )
        console.log(`\nUsage: ${GREEN}december key <provider> [api-key]${RESET}`)
        console.log(`\nExamples:`)
        console.log(`  december key openai sk-...`)
        console.log(`  december key anthropic sk-ant-...`)
        console.log(`  december key openrouter sk-or-...`)
        console.log(`  december key deepseek sk-...`)
        console.log(`  december key groq gsk_...\n`)
        return
    }

    let finalKey = key
    if (!finalKey) {
        const readline = await import('node:readline/promises')
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        finalKey = (await rl.question(`Enter API key for ${provider.toUpperCase()}: `)).trim()
        rl.close()
    }

    if (!finalKey) {
        console.log('No API key provided. Operation cancelled.')
        return
    }

    const { getDefaultModelForProvider } = await import('./utils/models')
    const defaultModel = getDefaultModelForProvider(provider)

    const config = await loadConfig()
    config.providers = config.providers || {}
    config.providers[provider] = finalKey
    config.activeProvider = provider
    config.activeModel = defaultModel
    config.authPriority = 'byok'
    await saveConfig(config)

    const { fetchLiveProviderModels } = await import('./utils/models')
    fetchLiveProviderModels(provider, finalKey).catch(() => {})

    console.log(
        `\n${GREEN}Successfully saved API key for ${provider.toUpperCase()} (Model: ${defaultModel})!${RESET}\n`
    )
}

export async function handleLoginCommand(options?: { provider?: string }): Promise<void> {
    const targetProvider = (options?.provider || 'december').toLowerCase().trim()
    const { loadConfig, saveConfig } = await import('./config')

    if (
        targetProvider === 'copilot' ||
        targetProvider === 'github' ||
        targetProvider === 'claude' ||
        targetProvider === 'codex' ||
        targetProvider === 'chatgpt' ||
        targetProvider === 'openai' ||
        targetProvider === 'gemini' ||
        targetProvider === 'google' ||
        targetProvider === 'antigravity'
    ) {
        const {
            loginSubscription,
            formatSubscriptionDisplayName,
            formatSubscriptionPlan,
            formatSubscriptionIdentity,
        } = await import('./auth/subscriptions')
        const providerName = formatSubscriptionDisplayName(targetProvider)
        console.log(`\nInitiating subscription login for ${providerName}...`)
        const bundle = await loginSubscription(targetProvider, (code, uri) => {
            console.log(
                `\nPlease open ${uri} in your browser and enter code: ${code}\nWaiting for authorization...`
            )
        })
        const configToSave = await loadConfig()
        configToSave.subscriptions = configToSave.subscriptions || {}
        configToSave.subscriptions[bundle.provider] = bundle
        configToSave.activeProvider = bundle.provider
        configToSave.authPriority = 'subscription'
        await saveConfig(configToSave)

        const { fetchLiveProviderModels } = await import('./utils/models')
        fetchLiveProviderModels(bundle.provider, bundle.accessToken, bundle.endpoint).catch(
            () => {}
        )

        const GREEN = '\x1b[38;2;110;231;183m'
        const WHITE = '\x1b[38;2;244;244;245m'
        const RESET = '\x1b[0m'
        const plan = formatSubscriptionPlan(bundle)
        const identity = formatSubscriptionIdentity(bundle)

        console.log(`\n${GREEN}Linked ${providerName} Subscription${RESET}`)
        console.log(`  • Plan:         ${WHITE}${plan}${RESET}`)
        if (identity) {
            console.log(`  • Account:      ${WHITE}${identity}${RESET}`)
        }
        if (configToSave.activeModel) {
            console.log(`  • Active Model: ${WHITE}${configToSave.activeModel}${RESET}`)
        }
        console.log(`  • Auth Mode:    ${WHITE}Subscription (Flat-rate)${RESET}\n`)
        return
    }

    // Default December device code login
    const { loginViaDeviceCode } = await import('./auth')
    console.log('\nGenerating device code for December login...')
    const { token, email } = await loginViaDeviceCode(undefined, (code, uri) => {
        console.log(
            `\nPlease open ${uri} on any device and enter code: ${code}\nWaiting for authorization...`
        )
    })
    const configToSave = await loadConfig()
    configToSave.decemberToken = token
    if (email) configToSave.email = email
    configToSave.authPriority = 'december'
    await saveConfig(configToSave)
    console.log('\x1b[32mSuccessfully logged in via device code!\x1b[0m\n')
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

export async function handleUpdateCommand(options?: { force?: boolean }): Promise<void> {
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
        currentVersion: pkg.version,
        force: options?.force,
        onProgress: (msg) => {
            console.log(`${BLUE}✱${RESET}  ${msg}`)
        },
    })

    if (result.method === 'source') {
        console.log(
            `\n${BLUE}✱${RESET}  Running December CLI from local source development directory.`
        )
        console.log(
            `   Run ${WHITE}git pull && bun install && bun --cwd apps/cli run build${RESET} to update.\n`
        )
        return
    }

    if (result.method === 'npx') {
        console.log(`\n${BLUE}✱${RESET}  Running December CLI via npx/bunx.`)
        console.log(`   Each invocation automatically pulls the latest version.\n`)
        return
    }

    if (result.alreadyUpToDate) {
        console.log(
            `\n  ${WHITE}You are already using the latest version of December CLI (v${result.installedVersion || result.targetVersion}).${RESET}`
        )
        console.log(`   ${GRAY}Use ${WHITE}december update --force${GRAY} to reinstall.${RESET}\n`)
        return
    }

    if (result.success) {
        const versionStr = result.installedVersion ? ` to v${result.installedVersion}` : ''
        console.log(
            `\n  ${GREEN}December CLI successfully updated${versionStr} via ${result.method}!${RESET}`
        )

        if (result.collisionFixed && result.cleanedBinaries && result.cleanedBinaries.length > 0) {
            console.log(
                `\n  ${WHITE}Resolved ${result.cleanedBinaries.length} conflicting older binary location(s):${RESET}`
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
        if (result.isPermissionError) {
            console.error(`\n${RED}Permission denied while installing global package.${RESET}`)
            console.error(
                `   ${YELLOW}→${RESET} Try running with elevated permissions: ${WHITE}${result.sudoCmd || result.manualCmd}${RESET}\n`
            )
        } else {
            console.error(
                `\n${RED}Failed to update December CLI via ${result.method}: ${result.error || 'Unknown error'}${RESET}`
            )
            console.error(`   Try running manually: ${WHITE}${result.manualCmd}${RESET}\n`)
        }
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
                        `  ${GREEN}Forwarded ${fixed.length} shadowed binary path(s) to primary active binary (${target.path}).${RESET}`
                    )
                    console.log(
                        `  ${YELLOW}ℹ Run "hash -r" (bash) or restart your terminal to apply.${RESET}\n`
                    )
                } else {
                    console.log(`  ${GREEN}All binary links are already aligned.${RESET}\n`)
                }
            }
        } else {
            console.log(
                `  ${YELLOW}⚠ Multiple installations detected!${RESET} ${GRAY}Run ${WHITE}december doctor --fix${GRAY} to auto-align stale paths.${RESET}\n`
            )
        }
    } else {
        console.log(`  ${GREEN}No binary collisions detected. Clean single installation.${RESET}\n`)
    }

    // 4. Configuration & Auth
    const config = await loadConfig()
    const authStatus = await getAuthStatus()
    console.log(`${WHITE}Configuration & Authentication:${RESET}`)

    const subCount = config.subscriptions ? Object.keys(config.subscriptions).length : 0
    if (subCount > 0) {
        const subList = Object.keys(config.subscriptions!).join(', ')
        console.log(`  • Subscriptions:       ${GREEN}${subCount} active${RESET} (${subList})`)
    } else {
        console.log(
            `  • Subscriptions:       ${GRAY}None detected${RESET} (Run "december auth import")`
        )
    }

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

    console.log(
        `  • Auth Priority:       ${GRAY}${config.authPriority || authStatus.authPriority}${RESET}`
    )
    console.log('')
}
