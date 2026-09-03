import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

export const codexAdapter: SubscriptionAdapter = {
    provider: 'codex',
    displayName: 'OpenAI Codex / ChatGPT Subscription',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables
        const envToken =
            process.env.OPENAI_OAUTH_TOKEN ||
            process.env.CODEX_TOKEN ||
            process.env.OPENAI_CODEX_TOKEN ||
            process.env.OPENAI_API_KEY
        if (envToken) {
            return {
                provider: 'codex',
                accessToken: envToken,
                subscriptionType: 'chatgpt_plus',
                source: 'env',
                updatedAt: Date.now(),
            }
        }

        // 2. Check standard local credential files
        const home = process.env.HOME || os.homedir()
        const candidatePaths = [
            path.join(home, '.codex', 'auth.json'),
            path.join(home, '.config', 'codex', 'auth.json'),
            path.join(home, '.codex.json'),
            path.join(home, '.config', 'openai', 'auth.json'),
        ]

        for (const filePath of candidatePaths) {
            try {
                const raw = await fs.readFile(filePath, 'utf-8')
                const parsed = JSON.parse(raw)

                const accessToken =
                    parsed.OPENAI_API_KEY ||
                    parsed.tokens?.access_token ||
                    parsed.tokens?.accessToken ||
                    parsed.access_token ||
                    parsed.accessToken ||
                    parsed.session_token

                if (accessToken) {
                    const plan = parsed.plan || parsed.subscription_type || parsed.subscriptionType
                    const subscriptionType =
                        plan === 'pro'
                            ? 'chatgpt_pro'
                            : plan === 'team'
                              ? 'chatgpt_team'
                              : 'chatgpt_plus'

                    return {
                        provider: 'codex',
                        accessToken,
                        refreshToken:
                            parsed.tokens?.refresh_token ||
                            parsed.refresh_token ||
                            parsed.refreshToken,
                        expiresAt:
                            parsed.tokens?.expires_at || parsed.expires_at || parsed.expiresAt,
                        email: parsed.user?.email || parsed.email,
                        accountName: parsed.user?.name || parsed.name,
                        subscriptionType,
                        source: 'local_import',
                        updatedAt: Date.now(),
                        extra: { filePath },
                    }
                }
            } catch {
                // Intentionally swallowed: file missing or not readable
            }
        }

        return null
    },

    async refreshToken(bundle: SubscriptionTokenBundle): Promise<SubscriptionTokenBundle> {
        if (!bundle.refreshToken) {
            return bundle
        }

        try {
            const res = await fetch('https://auth0.openai.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: bundle.refreshToken,
                    client_id: 'pdlLIX2Y72MIlZrhqAoaa9VioqcvHQvY',
                }),
            })

            if (res.ok) {
                const data = (await res.json()) as any
                const newAccessToken = data.access_token || data.accessToken
                const newRefreshToken = data.refresh_token || bundle.refreshToken
                const expiresIn = data.expires_in || 3600

                return {
                    ...bundle,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: Date.now() + expiresIn * 1000,
                    updatedAt: Date.now(),
                }
            }
        } catch {
            // Intentionally swallowed: token refresh fallback
        }

        return bundle
    },

    async loginOAuth(
        onCode?: (code: string, uri: string) => void
    ): Promise<SubscriptionTokenBundle> {
        const detected = await this.detectLocal()
        if (detected) {
            return detected
        }

        throw new Error(
            'OpenAI Codex / ChatGPT subscription credentials not found.\n' +
                'Please run `codex login` or set `OPENAI_API_KEY` in your environment.'
        )
    },

    async verifyToken(bundle: SubscriptionTokenBundle): Promise<boolean> {
        if (!bundle || !bundle.accessToken) return false
        if (bundle.expiresAt && bundle.expiresAt < Date.now() && !bundle.refreshToken) {
            return false
        }
        return true
    },
}
