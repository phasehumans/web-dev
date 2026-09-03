import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

export const claudeAdapter: SubscriptionAdapter = {
    provider: 'claude',
    displayName: 'Claude Code (Anthropic)',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables
        const envToken =
            process.env.CLAUDE_CODE_OAUTH_TOKEN ||
            process.env.ANTHROPIC_AUTH_TOKEN ||
            process.env.ANTHROPIC_API_KEY
        if (envToken) {
            return {
                provider: 'claude',
                accessToken: envToken,
                subscriptionType: 'claude_pro',
                source: 'env',
                updatedAt: Date.now(),
            }
        }

        // 2. Check standard local credential files
        const home = process.env.HOME || os.homedir()
        const candidatePaths = [
            path.join(home, '.claude.json'),
            path.join(home, '.claude', '.credentials.json'),
            path.join(home, '.config', 'claude', 'credentials.json'),
        ]

        for (const filePath of candidatePaths) {
            try {
                const raw = await fs.readFile(filePath, 'utf-8')
                const parsed = JSON.parse(raw)

                // Structure A: claude.json with primaryApiKey and oauthAccount
                const primaryKey = parsed.primaryApiKey || parsed.apiKey
                if (primaryKey) {
                    const oauthAcc = parsed.oauthAccount || {}
                    return {
                        provider: 'claude',
                        accessToken: primaryKey,
                        email: oauthAcc.emailAddress || oauthAcc.email,
                        accountName: oauthAcc.displayName || oauthAcc.name,
                        subscriptionType: oauthAcc.seatTier || 'claude_pro',
                        source: 'local_import',
                        updatedAt: Date.now(),
                        extra: { filePath },
                    }
                }

                // Structure B: claudeAiOauth bundle
                if (parsed.claudeAiOauth) {
                    const oauth = parsed.claudeAiOauth
                    const accessToken = oauth.accessToken || oauth.access_token
                    if (accessToken) {
                        return {
                            provider: 'claude',
                            accessToken,
                            refreshToken: oauth.refreshToken || oauth.refresh_token,
                            expiresAt:
                                typeof oauth.expiresAt === 'number'
                                    ? oauth.expiresAt
                                    : oauth.expires_at
                                      ? Number(oauth.expires_at)
                                      : undefined,
                            email: oauth.account?.email || oauth.email,
                            accountName: oauth.account?.name || oauth.name,
                            subscriptionType: oauth.subscriptionType || 'claude_pro',
                            source: 'local_import',
                            updatedAt: Date.now(),
                            extra: { filePath },
                        }
                    }
                }

                // Structure C: top-level tokens or keys
                const token =
                    parsed.accessToken ||
                    parsed.access_token ||
                    parsed.tokens?.access_token ||
                    parsed.oauth_token
                if (token) {
                    return {
                        provider: 'claude',
                        accessToken: token,
                        refreshToken: parsed.refreshToken || parsed.tokens?.refresh_token,
                        expiresAt: parsed.expiresAt || parsed.tokens?.expires_at,
                        email: parsed.email || parsed.account?.email,
                        subscriptionType: parsed.subscriptionType || 'claude_pro',
                        source: 'local_import',
                        updatedAt: Date.now(),
                        extra: { filePath },
                    }
                }
            } catch {
                // Intentionally swallowed: file not present or unreadable, check next
            }
        }

        return null
    },

    async refreshToken(bundle: SubscriptionTokenBundle): Promise<SubscriptionTokenBundle> {
        if (!bundle.refreshToken) {
            return bundle
        }

        try {
            const res = await fetch('https://api.anthropic.com/v1/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: bundle.refreshToken,
                    client_id: 'claude-code-cli',
                }),
            })

            if (res.ok) {
                const data = (await res.json()) as any
                const newAccessToken = data.access_token || data.accessToken
                const newRefreshToken =
                    data.refresh_token || data.refreshToken || bundle.refreshToken
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
            // Intentionally swallowed: network error during token refresh fallback
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
            'Claude Code subscription credentials not found.\n' +
                'Please run `claude login` or set `ANTHROPIC_API_KEY` in your environment.'
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
