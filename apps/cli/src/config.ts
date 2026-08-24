import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
export interface ProviderConfig {
    provider:
        | 'openai'
        | 'anthropic'
        | 'gemini'
        | 'openrouter'
        | 'deepseek'
        | 'groq'
        | 'huggingface'
        | 'kimi'
        | 'moonshoot'
        | 'mistral'
        | 'xai'
        | 'zai'
        | 'ollama'
        | string
    apiKey: string
    model?: string
    authMethod?: 'byok' | 'december' | 'env'
}

export interface DecemberConfig {
    activeProvider?: string
    activeModel?: string
    providers: Record<string, string>
    decemberToken?: string
    email?: string
    nonWorkspaceAccess?: boolean
    showActiveTasks?: boolean
    toolPermission?: 'always-proceed' | 'always-ask'
    compactMode?: boolean
    soundEffects?: boolean
    autoScroll?: boolean
    streamSpeed?: 'smooth' | 'instant'
    approvedTools?: string[]
    thinkingLevel?: 'auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high'
    steeringMode?: 'all' | 'one-at-a-time'
    followUpMode?: 'all' | 'one-at-a-time'
    pathGuard?: boolean
    scope?: string
    authPriority?: 'byok' | 'december'
    installMethod?: 'npm' | 'bun' | 'pnpm' | 'yarn' | 'brew' | 'npx' | 'source'
    versionCheckCache?: {
        latestVersion: string
        checkedAt: number
    }
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'december')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

function deepMergeSettings(base: any, overrides: any): any {
    const result = { ...base }
    for (const key of Object.keys(overrides)) {
        const overrideValue = overrides[key]
        const baseValue = base[key]
        if (overrideValue === undefined) continue

        if (
            typeof overrideValue === 'object' &&
            overrideValue !== null &&
            !Array.isArray(overrideValue) &&
            typeof baseValue === 'object' &&
            baseValue !== null &&
            !Array.isArray(baseValue)
        ) {
            result[key] = { ...baseValue, ...overrideValue }
        } else {
            result[key] = overrideValue
        }
    }
    return result
}

export async function loadConfig(): Promise<DecemberConfig> {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8')
        let config = JSON.parse(data)

        try {
            const workspacePath = path.join(process.cwd(), '.december', 'settings.json')
            const wData = await fs.readFile(workspacePath, 'utf-8')
            const workspaceConfig = JSON.parse(wData)
            config = deepMergeSettings(config, workspaceConfig)
        } catch {
            // workspace config is optional
        }

        // self-heal: if providers exist but activeprovider is missing, select the first available
        if (
            !config.activeProvider &&
            config.providers &&
            Object.keys(config.providers).length > 0
        ) {
            config.activeProvider = Object.keys(config.providers)[0]
        }

        return config
    } catch {
        return { providers: {} }
    }
}

export async function saveConfig(config: DecemberConfig): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true })
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')

    try {
        const workspacePath = path.join(process.cwd(), '.december', 'settings.json')
        await fs.access(workspacePath)
        let currentWorkspaceSettings: any = {}
        try {
            const raw = await fs.readFile(workspacePath, 'utf-8')
            currentWorkspaceSettings = JSON.parse(raw)
        } catch {
            // Intentionally swallowed: fallback to empty workspace settings if unreadable
        }
        if (config.thinkingLevel !== undefined)
            currentWorkspaceSettings.thinkingLevel = config.thinkingLevel
        if (config.steeringMode !== undefined)
            currentWorkspaceSettings.steeringMode = config.steeringMode
        if (config.followUpMode !== undefined)
            currentWorkspaceSettings.followUpMode = config.followUpMode
        if (config.toolPermission !== undefined)
            currentWorkspaceSettings.toolPermission = config.toolPermission
        if (config.pathGuard !== undefined) currentWorkspaceSettings.pathGuard = config.pathGuard
        if (config.nonWorkspaceAccess !== undefined)
            currentWorkspaceSettings.nonWorkspaceAccess = config.nonWorkspaceAccess

        await fs.writeFile(
            workspacePath,
            JSON.stringify(currentWorkspaceSettings, null, 2) + '\n',
            'utf-8'
        )
    } catch {
        // Intentionally swallowed: workspace settings file does not exist or is not writable
    }
}

export async function getProviderConfig(): Promise<ProviderConfig | undefined> {
    const config = await loadConfig()

    const hasByokConfig =
        config.activeProvider && config.providers && config.providers[config.activeProvider]
    const hasDecember = !!config.decemberToken

    // if preferred is december and it exists, use it first
    if (config.authPriority === 'december' && hasDecember) {
        return {
            provider: 'december_proxy',
            apiKey: config.decemberToken!,
            model: config.activeModel,
            authMethod: 'december',
        }
    }

    // wallet vs byok priority: byok via config file takes precedence.
    if (hasByokConfig) {
        return {
            provider: config.activeProvider as any,
            apiKey: config.providers[config.activeProvider!],
            model: config.activeModel,
            authMethod: 'byok',
        }
    }

    // wallet fallback
    if (hasDecember) {
        return {
            provider: 'december_proxy',
            apiKey: config.decemberToken!,
            model: config.activeModel,
            authMethod: 'december',
        }
    }

    return undefined
}

export async function getAuthStatus() {
    const config = await loadConfig()
    const hasByokConfig = !!(
        config.activeProvider &&
        config.providers &&
        config.providers[config.activeProvider]
    )
    return {
        hasByok: hasByokConfig,
        hasDecember: !!config.decemberToken,
        authPriority: config.authPriority || 'byok',
    }
}
