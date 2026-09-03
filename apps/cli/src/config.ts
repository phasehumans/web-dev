import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { ensureValidModelForProvider } from './utils/models'

import type { SubscriptionTokenBundle } from './auth/subscriptions/types'

export type { SubscriptionTokenBundle } from './auth/subscriptions/types'

export interface ProviderConfig {
    provider:
        | 'openai'
        | 'anthropic'
        | 'gemini'
        | 'google'
        | 'claude'
        | 'codex'
        | 'copilot'
        | 'openrouter'
        | 'deepseek'
        | 'groq'
        | 'huggingface'
        | 'kimi'
        | 'moonshoot'
        | 'mistral'
        | 'xai'
        | 'zai'
        | 'nvidia'
        | 'sambanova'
        | 'cerebras'
        | 'siliconflow'
        | 'together'
        | 'hyperbolic'
        | 'fireworks'
        | 'perplexity'
        | 'cohere'
        | 'ollama'
        | 'agentrouter'
        | 'december_proxy'
        | string
    apiKey: string
    model?: string
    authMethod?: 'byok' | 'december' | 'env' | 'subscription'
    subscription?: SubscriptionTokenBundle
    headers?: Record<string, string>
    baseURL?: string
}

export interface DecemberConfig {
    activeProvider?: string
    activeModel?: string
    providers: Record<string, string>
    subscriptions?: Record<string, SubscriptionTokenBundle>
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
    authPriority?: 'subscription' | 'byok' | 'december'
    installMethod?: 'npm' | 'bun' | 'pnpm' | 'npx' | 'source'
    versionCheckCache?: {
        latestVersion: string
        checkedAt: number
    }
}

export function getConfigDir(): string {
    return path.join(process.env.HOME || os.homedir(), '.config', 'december')
}

export function getConfigFile(): string {
    return path.join(getConfigDir(), 'config.json')
}

export function getLogsDir(): string {
    return process.env.DECEMBER_LOGS_DIR || path.join(getConfigDir(), 'logs')
}

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
        const configFile = getConfigFile()
        const data = await fs.readFile(configFile, 'utf-8')
        let config = JSON.parse(data)

        try {
            const workspacePath = path.join(process.cwd(), '.december', 'settings.json')
            const wData = await fs.readFile(workspacePath, 'utf-8')
            const workspaceConfig = JSON.parse(wData)
            config = deepMergeSettings(config, workspaceConfig)
        } catch {
            // workspace config is optional
        }

        // self-heal: if providers exist but activeProvider is missing, select the first available
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
    const configDir = getConfigDir()
    const configFile = getConfigFile()
    await fs.mkdir(configDir, { recursive: true })
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8')
    await fs.chmod(configFile, 0o600).catch(() => {})

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

export async function updateConfig(partial: Partial<DecemberConfig>): Promise<DecemberConfig> {
    const current = await loadConfig()
    const updated = { ...current, ...partial }
    await saveConfig(updated)
    return updated
}

function resolveSubscriptionBundle(
    config: DecemberConfig
): { provider: string; bundle: SubscriptionTokenBundle } | undefined {
    if (!config.subscriptions || Object.keys(config.subscriptions).length === 0) {
        return undefined
    }

    const activeProvider = config.activeProvider
    if (activeProvider && config.subscriptions[activeProvider]) {
        return { provider: activeProvider, bundle: config.subscriptions[activeProvider] }
    }

    // Check alias maps (e.g. anthropic -> claude, openai -> codex, google -> gemini)
    if (activeProvider === 'anthropic' && config.subscriptions['claude']) {
        return { provider: 'claude', bundle: config.subscriptions['claude'] }
    }
    if (activeProvider === 'openai' && config.subscriptions['codex']) {
        return { provider: 'codex', bundle: config.subscriptions['codex'] }
    }
    if (activeProvider === 'google' && config.subscriptions['gemini']) {
        return { provider: 'gemini', bundle: config.subscriptions['gemini'] }
    }

    const firstKey = Object.keys(config.subscriptions)[0]
    return { provider: firstKey, bundle: config.subscriptions[firstKey] }
}

export async function getProviderConfig(): Promise<ProviderConfig | undefined> {
    const config = await loadConfig()

    const hasByokConfig = !!(
        config.activeProvider &&
        config.providers &&
        config.providers[config.activeProvider]
    )
    const hasDecember = !!config.decemberToken
    const subMatch = resolveSubscriptionBundle(config)

    // 1. If explicit authPriority is december
    if (config.authPriority === 'december' && hasDecember) {
        const model = ensureValidModelForProvider('december_proxy', config.activeModel)
        return {
            provider: 'december_proxy',
            apiKey: config.decemberToken!,
            model,
            authMethod: 'december',
        }
    }

    // 2. If explicit authPriority is byok
    if (config.authPriority === 'byok' && hasByokConfig) {
        const model = ensureValidModelForProvider(config.activeProvider!, config.activeModel)
        return {
            provider: config.activeProvider as any,
            apiKey: config.providers[config.activeProvider!],
            model,
            authMethod: 'byok',
        }
    }

    // 3. Priority Order: Subscription -> BYOK -> December Proxy -> Environment Variables
    if (subMatch && config.authPriority !== 'byok' && config.authPriority !== 'december') {
        const { resolveSubscriptionToken } =
            await import('./auth/subscriptions/subscription-manager')
        const resolvedBundle = await resolveSubscriptionToken(subMatch.provider, subMatch.bundle)
        const targetProvider = resolvedBundle.provider || subMatch.provider
        const model = ensureValidModelForProvider(targetProvider, config.activeModel)

        return {
            provider: targetProvider,
            apiKey: resolvedBundle.accessToken,
            model,
            authMethod: 'subscription',
            subscription: resolvedBundle,
            baseURL: resolvedBundle.endpoint,
        }
    }

    // 4. BYOK in config takes precedence over December proxy fallback
    if (hasByokConfig) {
        const model = ensureValidModelForProvider(config.activeProvider!, config.activeModel)
        return {
            provider: config.activeProvider as any,
            apiKey: config.providers[config.activeProvider!],
            model,
            authMethod: 'byok',
        }
    }

    // 5. December Proxy fallback
    if (hasDecember) {
        const model = ensureValidModelForProvider('december_proxy', config.activeModel)
        return {
            provider: 'december_proxy',
            apiKey: config.decemberToken!,
            model,
            authMethod: 'december',
        }
    }

    // 6. Check if local subscription can be auto-detected from environment variables
    if (
        process.env.CLAUDE_CODE_OAUTH_TOKEN ||
        process.env.ANTHROPIC_AUTH_TOKEN ||
        process.env.COPILOT_TOKEN ||
        process.env.GITHUB_COPILOT_TOKEN ||
        process.env.OPENAI_OAUTH_TOKEN ||
        process.env.CODEX_TOKEN ||
        process.env.GEMINI_OAUTH_TOKEN ||
        process.env.ANTIGRAVITY_TOKEN
    ) {
        const { detectAllSubscriptions, resolveSubscriptionToken } =
            await import('./auth/subscriptions/subscription-manager')
        const detected = await detectAllSubscriptions()
        const firstKey = Object.keys(detected)[0]
        if (firstKey && detected[firstKey]) {
            const resolvedBundle = await resolveSubscriptionToken(firstKey, detected[firstKey])
            const targetProvider = resolvedBundle.provider || firstKey
            const model = ensureValidModelForProvider(targetProvider, config.activeModel)
            return {
                provider: targetProvider,
                apiKey: resolvedBundle.accessToken,
                model,
                authMethod: 'subscription',
                subscription: resolvedBundle,
                baseURL: resolvedBundle.endpoint,
            }
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
    const subscriptions = config.subscriptions ? Object.keys(config.subscriptions) : []
    const hasSubscription = subscriptions.length > 0

    return {
        hasByok: hasByokConfig,
        hasDecember: !!config.decemberToken,
        hasSubscription,
        subscriptions,
        authPriority: config.authPriority || (hasSubscription ? 'subscription' : 'byok'),
    }
}
