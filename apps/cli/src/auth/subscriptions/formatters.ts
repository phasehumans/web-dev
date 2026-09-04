import type { SubscriptionTokenBundle } from './types'

export function formatSubscriptionDisplayName(provider?: string): string {
    const norm = (provider || '').toLowerCase().trim()
    switch (norm) {
        case 'claude':
        case 'anthropic':
            return 'Anthropic Claude'
        case 'copilot':
        case 'github':
        case 'github_copilot':
            return 'GitHub Copilot'
        case 'codex':
        case 'chatgpt':
        case 'openai':
            return 'OpenAI ChatGPT'
        case 'gemini':
        case 'google':
        case 'antigravity':
            return 'Google Gemini'
        default:
            return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'AI'
    }
}

export function formatSubscriptionPlan(bundle: Partial<SubscriptionTokenBundle>): string {
    const rawType = (bundle.subscriptionType || '').toLowerCase().trim()
    const provider = (bundle.provider || '').toLowerCase().trim()

    if (provider === 'claude' || provider === 'anthropic') {
        if (rawType.includes('team')) return 'Claude Team'
        if (rawType.includes('max') || rawType.includes('enterprise')) return 'Claude Enterprise'
        return 'Claude Pro'
    }

    if (provider === 'codex' || provider === 'chatgpt' || provider === 'openai') {
        if (rawType.includes('pro')) return 'ChatGPT Pro'
        if (rawType.includes('team')) return 'ChatGPT Team'
        if (rawType.includes('go')) return 'ChatGPT Go'
        return 'ChatGPT Plus'
    }

    if (provider === 'copilot' || provider === 'github' || provider === 'github_copilot') {
        if (rawType.includes('business') || rawType.includes('for_business'))
            return 'Copilot Business'
        if (rawType.includes('enterprise')) return 'Copilot Enterprise'
        return 'Copilot Individual'
    }

    if (provider === 'gemini' || provider === 'google' || provider === 'antigravity') {
        if (rawType.includes('google_one') || rawType.includes('one_ai'))
            return 'Google One AI Premium'
        if (rawType.includes('cloud_code')) return 'Google Cloud Code'
        return 'Gemini Advanced'
    }

    if (rawType) {
        return rawType
            .split(/[_-]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
    }

    return 'Active Subscription'
}

export function formatSubscriptionIdentity(
    bundle: Partial<SubscriptionTokenBundle>
): string | undefined {
    if (bundle.email && bundle.email.trim()) {
        return bundle.email.trim()
    }
    if (bundle.accountName && bundle.accountName.trim()) {
        const name = bundle.accountName.trim()
        const isGithub = bundle.provider === 'copilot' || bundle.provider === 'github'
        return isGithub && !name.startsWith('@') ? `@${name}` : name
    }
    return undefined
}

export function formatSubscriptionToast(
    bundle: Partial<SubscriptionTokenBundle>,
    activeModel?: string
): string {
    const plan = formatSubscriptionPlan(bundle)
    const identity = formatSubscriptionIdentity(bundle)
    const providerName = formatSubscriptionDisplayName(bundle.provider)

    // For Copilot Individual or standard providers, format smoothly
    const subject =
        plan === 'Copilot Individual' || plan === 'Active Subscription' ? providerName : plan

    const accountPart = identity ? ` (${identity})` : ''
    const modelPart = activeModel ? ` • ${activeModel}` : ''

    return `Connected to ${subject}${accountPart}${modelPart}`
}

export function formatSubscriptionCard(
    bundle: Partial<SubscriptionTokenBundle>,
    activeModel?: string
): string {
    const providerName = formatSubscriptionDisplayName(bundle.provider)
    const plan = formatSubscriptionPlan(bundle)
    const identity = formatSubscriptionIdentity(bundle)

    const lines = [`Linked ${providerName} Subscription`, `  • Plan:         ${plan}`]

    if (identity) {
        lines.push(`  • Account:      ${identity}`)
    }
    if (activeModel) {
        lines.push(`  • Active Model: ${activeModel}`)
    }
    lines.push(`  • Auth Mode:    Subscription (Flat-rate)`)

    return lines.join('\n')
}
