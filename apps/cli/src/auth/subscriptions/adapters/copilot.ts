import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { openUrl } from '../../../utils/open'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

export const GITHUB_COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98'
export const COPILOT_TOKEN_ENDPOINT = 'https://api.github.com/copilot_internal/v2/token'

export async function exchangeGitHubTokenForCopilot(
    githubOAuthToken: string
): Promise<{ token: string; expiresAt: number; endpoint: string }> {
    const res = await fetch(COPILOT_TOKEN_ENDPOINT, {
        headers: {
            Authorization: `token ${githubOAuthToken}`,
            'Editor-Version': 'vscode/1.95.0',
            'Editor-Plugin-Version': 'copilot/1.240.0',
            'User-Agent': 'GithubCopilot/1.240.0',
            Accept: 'application/json',
        },
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(
            `Failed to exchange GitHub token for Copilot token (${res.status}): ${text}`
        )
    }

    const data = (await res.json()) as any
    const token = data.token
    const expiresAt =
        typeof data.expires_at === 'number'
            ? data.expires_at * 1000 // Copilot token endpoint returns unix epoch in seconds
            : Date.now() + 1800 * 1000
    const endpoint = data.endpoints?.api || 'https://api.individual.githubcopilot.com'

    return { token, expiresAt, endpoint }
}

export const copilotAdapter: SubscriptionAdapter = {
    provider: 'copilot',
    displayName: 'GitHub Copilot Subscription',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables
        const envToken =
            process.env.COPILOT_TOKEN ||
            process.env.GITHUB_COPILOT_TOKEN ||
            process.env.GITHUB_TOKEN ||
            process.env.GH_TOKEN
        if (envToken) {
            return {
                provider: 'copilot',
                accessToken: envToken,
                subscriptionType: 'copilot',
                source: 'env',
                updatedAt: Date.now(),
                extra: { rawToken: envToken },
            }
        }

        // 2. Check standard local credential files
        const home = process.env.HOME || os.homedir()
        const candidatePaths = [
            path.join(home, '.config', 'github-copilot', 'hosts.json'),
            path.join(home, '.config', 'github-copilot', 'apps.json'),
            path.join(home, '.config', 'github-copilot', 'config.json'),
            path.join(home, 'AppData', 'Local', 'github-copilot', 'hosts.json'),
            path.join(home, 'AppData', 'Local', 'github-copilot', 'apps.json'),
        ]

        for (const filePath of candidatePaths) {
            try {
                const raw = await fs.readFile(filePath, 'utf-8')
                const parsed = JSON.parse(raw)

                // Structure A: hosts.json format: { "github.com": { "user": "...", "oauth_token": "..." } }
                if (parsed['github.com']) {
                    const gh = parsed['github.com']
                    const oauthToken = gh.oauth_token || gh.oauthToken || gh.token
                    if (oauthToken) {
                        return {
                            provider: 'copilot',
                            accessToken: oauthToken,
                            accountName: gh.user || gh.account,
                            subscriptionType: 'copilot',
                            source: 'local_import',
                            updatedAt: Date.now(),
                            extra: { filePath, rawToken: oauthToken },
                        }
                    }
                }

                // Structure B: top-level token
                const token =
                    parsed.oauth_token || parsed.oauthToken || parsed.token || parsed.accessToken
                if (token) {
                    return {
                        provider: 'copilot',
                        accessToken: token,
                        accountName: parsed.user || parsed.account,
                        subscriptionType: 'copilot',
                        source: 'local_import',
                        updatedAt: Date.now(),
                        extra: { filePath, rawToken: token },
                    }
                }
            } catch {
                // Intentionally swallowed: file not present, check next
            }
        }

        return null
    },

    async refreshToken(bundle: SubscriptionTokenBundle): Promise<SubscriptionTokenBundle> {
        const rawToken = bundle.extra?.rawToken || bundle.accessToken
        // If the token is a GitHub OAuth token (starts with gho_, ghu_, github_pat_, etc.)
        // we can exchange it for a fresh Copilot session token
        if (
            rawToken.startsWith('gho_') ||
            rawToken.startsWith('ghu_') ||
            rawToken.startsWith('github_pat_') ||
            rawToken.startsWith('ghp_')
        ) {
            try {
                const { token, expiresAt, endpoint } = await exchangeGitHubTokenForCopilot(rawToken)
                return {
                    ...bundle,
                    accessToken: token,
                    endpoint,
                    expiresAt,
                    updatedAt: Date.now(),
                    extra: { ...bundle.extra, rawToken },
                }
            } catch {
                // Intentionally swallowed: fallback to keeping existing bundle
            }
        }

        return bundle
    },

    async loginOAuth(
        onCode?: (code: string, uri: string) => void
    ): Promise<SubscriptionTokenBundle> {
        // GitHub Device Code Flow
        const codeRes = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: GITHUB_COPILOT_CLIENT_ID,
                scope: 'read:user',
            }),
        })

        if (!codeRes.ok) {
            throw new Error(`Failed to request GitHub device code (${codeRes.status})`)
        }

        const codeData = (await codeRes.json()) as any
        const { device_code, user_code, verification_uri, expires_in, interval } = codeData

        if (onCode) {
            onCode(user_code, verification_uri)
        }

        // Auto-open browser
        openUrl(verification_uri).catch(() => {})

        // Poll for access token
        const pollInterval = (interval || 5) * 1000
        const startTime = Date.now()
        const maxTime = (expires_in || 900) * 1000

        const ghOAuthToken: string = await new Promise((resolve, reject) => {
            const poll = async () => {
                if (Date.now() - startTime > maxTime) {
                    reject(new Error('GitHub device code expired.'))
                    return
                }

                try {
                    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            client_id: GITHUB_COPILOT_CLIENT_ID,
                            device_code,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                        }),
                    })

                    const tokenData = (await tokenRes.json()) as any
                    if (tokenData.access_token) {
                        resolve(tokenData.access_token)
                        return
                    }

                    if (
                        tokenData.error === 'authorization_pending' ||
                        tokenData.error === 'slow_down'
                    ) {
                        setTimeout(poll, pollInterval)
                    } else {
                        reject(
                            new Error(
                                tokenData.error_description ||
                                    tokenData.error ||
                                    'Authentication failed'
                            )
                        )
                    }
                } catch {
                    setTimeout(poll, pollInterval)
                }
            }

            setTimeout(poll, pollInterval)
        })

        // Exchange for copilot session token
        let copilotToken = ghOAuthToken
        let endpoint = 'https://api.individual.githubcopilot.com'
        let expiresAt = Date.now() + 1800 * 1000

        try {
            const exchangeResult = await exchangeGitHubTokenForCopilot(ghOAuthToken)
            copilotToken = exchangeResult.token
            endpoint = exchangeResult.endpoint
            expiresAt = exchangeResult.expiresAt
        } catch {
            // Intentionally swallowed: use raw token if immediate exchange fails
        }

        return {
            provider: 'copilot',
            accessToken: copilotToken,
            endpoint,
            expiresAt,
            subscriptionType: 'copilot',
            source: 'oauth_login',
            updatedAt: Date.now(),
            extra: { rawToken: ghOAuthToken },
        }
    },

    async verifyToken(bundle: SubscriptionTokenBundle): Promise<boolean> {
        if (!bundle || !bundle.accessToken) return false

        // 1. If we have a valid unexpired Copilot session token, it is already verified
        if (bundle.expiresAt && bundle.expiresAt > Date.now()) {
            return true
        }

        // 2. If token is a GitHub OAuth / PAT token (or session token is expired), verify via exchange
        const rawToken = bundle.extra?.rawToken || bundle.accessToken
        if (
            rawToken &&
            (rawToken.startsWith('gho_') ||
                rawToken.startsWith('ghu_') ||
                rawToken.startsWith('github_pat_') ||
                rawToken.startsWith('ghp_'))
        ) {
            try {
                const res = await exchangeGitHubTokenForCopilot(rawToken)
                return !!res.token
            } catch {
                return false
            }
        }

        if (bundle.accessToken.includes('tid=') || bundle.accessToken.includes('exp=')) {
            if (bundle.expiresAt && bundle.expiresAt < Date.now()) {
                return false
            }
            return true
        }

        return true
    },
}
