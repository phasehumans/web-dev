import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

export const geminiAdapter: SubscriptionAdapter = {
    provider: 'gemini',
    displayName: 'Google Antigravity / Gemini Advanced',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables
        const envToken =
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY ||
            process.env.GEMINI_OAUTH_TOKEN ||
            process.env.ANTIGRAVITY_TOKEN ||
            process.env.GOOGLE_OAUTH_TOKEN
        if (envToken) {
            return {
                provider: 'gemini',
                accessToken: envToken,
                subscriptionType: 'gemini_advanced',
                source: 'env',
                updatedAt: Date.now(),
            }
        }

        // 2. Check standard local credential files
        const home = process.env.HOME || os.homedir()
        const candidatePaths = [
            path.join(home, '.gemini', 'antigravity-cli', 'antigravity-oauth-token'),
            path.join(home, '.gemini', 'antigravity-cli', 'auth.json'),
            path.join(home, '.gemini', 'gemini-credentials.json'),
            path.join(home, '.gemini', 'google_accounts.json'),
            path.join(home, '.gemini', 'auth.json'),
            path.join(home, '.gemini', 'credentials.json'),
            path.join(home, '.config', 'gcloud', 'application_default_credentials.json'),
        ]

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            candidatePaths.unshift(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        }

        for (const filePath of candidatePaths) {
            try {
                const raw = await fs.readFile(filePath, 'utf-8')
                let parsed: any
                try {
                    parsed = JSON.parse(raw)
                } catch {
                    // Plain text token (e.g. raw token string)
                    if (raw.trim().length > 20 && !raw.includes('\n')) {
                        return {
                            provider: 'gemini',
                            accessToken: raw.trim(),
                            subscriptionType: 'gemini_advanced',
                            source: 'local_import',
                            updatedAt: Date.now(),
                            extra: { filePath },
                        }
                    }
                    continue
                }

                // Antigravity nested token: { token: { access_token: '...', refresh_token: '...', expiry: '...' } }
                const tokenObj =
                    typeof parsed.token === 'object' && parsed.token !== null
                        ? parsed.token
                        : parsed

                const accessToken =
                    tokenObj.access_token ||
                    tokenObj.accessToken ||
                    tokenObj.token ||
                    parsed.access_token ||
                    parsed.accessToken ||
                    (typeof parsed.token === 'string' ? parsed.token : undefined) ||
                    parsed.client_secret

                if (accessToken) {
                    let expiresAt: number | undefined
                    const expiryVal =
                        tokenObj.expiry ||
                        tokenObj.expires_at ||
                        parsed.token_expiry ||
                        parsed.expiresAt
                    if (expiryVal) {
                        expiresAt =
                            typeof expiryVal === 'string'
                                ? new Date(expiryVal).getTime()
                                : expiryVal * (expiryVal < 1e12 ? 1000 : 1)
                    }

                    return {
                        provider: 'gemini',
                        accessToken,
                        refreshToken:
                            tokenObj.refresh_token || parsed.refresh_token || parsed.refreshToken,
                        expiresAt,
                        email: parsed.account || parsed.email || parsed.client_email,
                        subscriptionType: 'gemini_advanced',
                        source: 'local_import',
                        updatedAt: Date.now(),
                        extra: { filePath },
                    }
                }
            } catch {
                // Intentionally swallowed: file not present, check next
            }
        }

        // 3. Check gcloud CLI if installed
        try {
            const gcloudToken = execSync(
                'gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token 2>/dev/null',
                {
                    encoding: 'utf-8',
                    timeout: 3000,
                }
            ).trim()
            if (gcloudToken && gcloudToken.startsWith('ya29.')) {
                return {
                    provider: 'gemini',
                    accessToken: gcloudToken,
                    subscriptionType: 'gemini_advanced',
                    source: 'local_import',
                    updatedAt: Date.now(),
                    extra: { source: 'gcloud_cli' },
                }
            }
        } catch {
            // Intentionally swallowed: gcloud not installed or not authenticated
        }

        return null
    },

    async refreshToken(bundle: SubscriptionTokenBundle): Promise<SubscriptionTokenBundle> {
        if (!bundle.refreshToken) {
            return bundle
        }

        try {
            const res = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: bundle.refreshToken,
                    client_id:
                        bundle.extra?.client_id ||
                        '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com',
                }),
            })

            if (res.ok) {
                const data = (await res.json()) as any
                const newAccessToken = data.access_token || data.accessToken
                const expiresIn = data.expires_in || 3600

                return {
                    ...bundle,
                    accessToken: newAccessToken,
                    expiresAt: Date.now() + expiresIn * 1000,
                    updatedAt: Date.now(),
                }
            }
        } catch {
            // Intentionally swallowed: network error fallback
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

        const { openUrl } = await import('../../../utils/open')
        const { startLocalOAuthServer, generatePKCE } = await import('../oauth-server')

        const clientId = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com'
        const scopes =
            'https://www.googleapis.com/auth/generative-language.tuning https://www.googleapis.com/auth/cloud-platform openid email profile'
        const { codeVerifier, codeChallenge, state } = generatePKCE()

        let server: any
        try {
            server = await startLocalOAuthServer({ timeoutMs: 120000 })
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
                clientId
            )}&redirect_uri=${encodeURIComponent(
                server.redirectUri
            )}&response_type=code&scope=${encodeURIComponent(
                scopes
            )}&code_challenge=${encodeURIComponent(
                codeChallenge
            )}&code_challenge_method=S256&state=${encodeURIComponent(
                state
            )}&access_type=offline&prompt=consent`

            if (onCode) {
                onCode('GOOGLE-AUTH', authUrl)
            }

            openUrl(authUrl).catch(() => {})

            const callbackResult = await server.waitForCallback()
            if (callbackResult.error) {
                throw new Error(
                    callbackResult.errorDescription ||
                        callbackResult.error ||
                        'Google authorization failed'
                )
            }

            const code = callbackResult.code
            if (!code) {
                throw new Error('No authorization code returned from Google login redirect.')
            }

            // Exchange authorization code for tokens
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: server.redirectUri,
                    client_id: clientId,
                    code_verifier: codeVerifier,
                }),
            })

            if (!tokenRes.ok) {
                const errText = await tokenRes.text().catch(() => '')
                throw new Error(`Google token exchange failed (${tokenRes.status}): ${errText}`)
            }

            const tokenData = (await tokenRes.json()) as any
            const accessToken = tokenData.access_token || tokenData.accessToken
            const refreshToken = tokenData.refresh_token || tokenData.refreshToken
            const expiresIn = tokenData.expires_in || 3600

            return {
                provider: 'gemini',
                accessToken,
                refreshToken,
                expiresAt: Date.now() + expiresIn * 1000,
                subscriptionType: 'gemini_advanced',
                source: 'oauth_login',
                updatedAt: Date.now(),
                extra: { client_id: clientId },
            }
        } catch (err: any) {
            if (server) {
                await server.close().catch(() => {})
            }
            throw new Error(
                `Google Antigravity / Gemini authorization failed: ${err.message}\n` +
                    'You can also run `gcloud auth application-default login` or set `GEMINI_API_KEY` in your environment.'
            )
        }
    },

    async verifyToken(bundle: SubscriptionTokenBundle): Promise<boolean> {
        if (!bundle || !bundle.accessToken) return false
        if (bundle.expiresAt && bundle.expiresAt < Date.now() && !bundle.refreshToken) {
            return false
        }
        return true
    },
}
