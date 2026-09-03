import { loadConfig, saveConfig } from '../../config'

import { claudeAdapter } from './adapters/claude'
import { codexAdapter } from './adapters/codex'
import { copilotAdapter } from './adapters/copilot'
import { geminiAdapter } from './adapters/gemini'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from './types'

const ADAPTERS: Record<string, SubscriptionAdapter> = {
    claude: claudeAdapter,
    anthropic: claudeAdapter,
    codex: codexAdapter,
    openai: codexAdapter,
    chatgpt: codexAdapter,
    copilot: copilotAdapter,
    github: copilotAdapter,
    gemini: geminiAdapter,
    google: geminiAdapter,
    antigravity: geminiAdapter,
}

export function getSubscriptionAdapter(provider: string): SubscriptionAdapter | undefined {
    const norm = (provider || '').toLowerCase().trim()
    return ADAPTERS[norm]
}

export async function detectAllSubscriptions(): Promise<Record<string, SubscriptionTokenBundle>> {
    const results: Record<string, SubscriptionTokenBundle> = {}
    const checked = new Set<string>()

    for (const [key, adapter] of Object.entries(ADAPTERS)) {
        if (checked.has(adapter.provider)) continue
        checked.add(adapter.provider)

        try {
            const bundle = await adapter.detectLocal()
            if (bundle && bundle.accessToken) {
                results[adapter.provider] = bundle
            }
        } catch {
            // Intentionally swallowed: fallback to skipping failing adapter
        }
    }

    return results
}

export async function importLocalSubscriptions(): Promise<{
    imported: string[]
    bundles: Record<string, SubscriptionTokenBundle>
}> {
    const detected = await detectAllSubscriptions()
    const importedKeys = Object.keys(detected)

    if (importedKeys.length > 0) {
        const config = await loadConfig()
        config.subscriptions = config.subscriptions || {}
        for (const [provider, bundle] of Object.entries(detected)) {
            config.subscriptions[provider] = bundle
        }
        await saveConfig(config)
    }

    return {
        imported: importedKeys,
        bundles: detected,
    }
}

export async function resolveSubscriptionToken(
    provider: string,
    bundle: SubscriptionTokenBundle
): Promise<SubscriptionTokenBundle> {
    const adapter = getSubscriptionAdapter(provider) || getSubscriptionAdapter(bundle.provider)
    if (!adapter || !adapter.refreshToken) {
        return bundle
    }

    const fiveMinutes = 5 * 60 * 1000
    const isExpiringSoon =
        !bundle.accessToken ||
        (bundle.expiresAt !== undefined && Date.now() >= bundle.expiresAt - fiveMinutes)

    // For Copilot with raw github token or expiring token, always ensure token refresh/exchange
    const isCopilotRaw =
        bundle.provider === 'copilot' &&
        (bundle.accessToken.startsWith('gho_') ||
            bundle.accessToken.startsWith('ghu_') ||
            bundle.accessToken.startsWith('github_pat_'))

    if (isExpiringSoon || isCopilotRaw) {
        try {
            const refreshed = await adapter.refreshToken(bundle)
            if (refreshed && refreshed.accessToken !== bundle.accessToken) {
                // Update persistent config if stored
                try {
                    const config = await loadConfig()
                    if (config.subscriptions && config.subscriptions[bundle.provider]) {
                        config.subscriptions[bundle.provider] = refreshed
                        await saveConfig(config)
                    }
                } catch {
                    // Intentionally swallowed: config save error handled gracefully
                }
                return refreshed
            }
        } catch {
            // Intentionally swallowed: fallback to using current bundle
        }
    }

    return bundle
}

export async function loginSubscription(
    provider: string,
    onCode?: (code: string, uri: string) => void
): Promise<SubscriptionTokenBundle> {
    const adapter = getSubscriptionAdapter(provider)
    if (!adapter || !adapter.loginOAuth) {
        throw new Error(`Subscription login is not supported for provider: ${provider}`)
    }

    const bundle = await adapter.loginOAuth(onCode)
    const config = await loadConfig()
    config.subscriptions = config.subscriptions || {}
    config.subscriptions[adapter.provider] = bundle
    config.activeProvider = adapter.provider
    await saveConfig(config)

    return bundle
}

export async function verifyAndResolveSubscription(
    provider: string
): Promise<SubscriptionTokenBundle | null> {
    const adapter = getSubscriptionAdapter(provider)
    if (!adapter) return null

    const config = await loadConfig()
    let bundle: SubscriptionTokenBundle | null = null

    // 1. Check if existing subscription stored in config
    if (config.subscriptions && config.subscriptions[adapter.provider]) {
        const storedBundle = config.subscriptions[adapter.provider]
        if (adapter.verifyToken) {
            const isValid = await adapter.verifyToken(storedBundle)
            if (isValid) {
                bundle = storedBundle
            }
        } else if (storedBundle.accessToken) {
            bundle = storedBundle
        }
    }

    // 2. If not in config (or invalid in config), attempt auto-detection from local files / env
    if (!bundle) {
        bundle = await adapter.detectLocal()
    }

    if (!bundle || !bundle.accessToken) {
        return null
    }

    // 3. Resolve / Refresh if expiring soon or Copilot raw token
    const resolvedBundle = await resolveSubscriptionToken(adapter.provider, bundle)

    // 4. Verify token via adapter
    if (adapter.verifyToken) {
        const isValid = await adapter.verifyToken(resolvedBundle)
        if (!isValid) {
            return null
        }
    }

    // 5. Persist to config and update active provider
    config.subscriptions = config.subscriptions || {}
    config.subscriptions[adapter.provider] = resolvedBundle
    config.activeProvider = adapter.provider
    await saveConfig(config)

    return resolvedBundle
}
