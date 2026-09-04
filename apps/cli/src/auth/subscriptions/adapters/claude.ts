import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
const AUTHORIZE_URL = 'https://claude.ai/oauth/authorize'
const TOKEN_URL = 'https://platform.claude.com/v1/oauth/token'
const CALLBACK_PORT = 53692
const CALLBACK_PATH = '/callback'
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`
const SCOPES =
    'org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload'
const DEFAULT_ENDPOINT = 'https://api.anthropic.com'

export const claudeAdapter: SubscriptionAdapter = {
    provider: 'claude',
    displayName: 'Claude Code (Anthropic)',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables (only OAuth / subscription tokens, NOT BYOK API keys)
        const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN
        if (envToken) {
            return {
                provider: 'claude',
                accessToken: envToken,
                subscriptionType: 'claude_pro',
                source: 'env',
                updatedAt: Date.now(),
                endpoint: DEFAULT_ENDPOINT,
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
                        endpoint: DEFAULT_ENDPOINT,
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
                            endpoint: DEFAULT_ENDPOINT,
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
                        endpoint: DEFAULT_ENDPOINT,
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
            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: CLIENT_ID,
                    refresh_token: bundle.refreshToken,
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
                    endpoint: bundle.endpoint || DEFAULT_ENDPOINT,
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

        const { openUrl } = await import('../../../utils/open')
        const { startLocalOAuthServer, generatePKCE } = await import('../oauth-server')

        const pkce = generatePKCE()

        let server: any
        try {
            server = await startLocalOAuthServer({
                port: CALLBACK_PORT,
                path: CALLBACK_PATH,
                redirectHost: 'localhost',
                timeoutMs: 180000,
            })
        } catch (err: any) {
            const recheck = await this.detectLocal()
            if (recheck) {
                return recheck
            }
            throw new Error(
                `Unable to start Claude OAuth callback server on port ${CALLBACK_PORT}: ${err.message}\n` +
                    'Please ensure no other Claude CLI instance is using port 53692 or run `claude login`.'
            )
        }

        try {
            const authUrl = new URL(AUTHORIZE_URL)
            authUrl.searchParams.set('code', 'true')
            authUrl.searchParams.set('client_id', CLIENT_ID)
            authUrl.searchParams.set('response_type', 'code')
            authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
            authUrl.searchParams.set('scope', SCOPES)
            authUrl.searchParams.set('code_challenge', pkce.codeChallenge)
            authUrl.searchParams.set('code_challenge_method', 'S256')
            authUrl.searchParams.set('state', pkce.state)

            const loginUrl = authUrl.toString()

            if (onCode) {
                onCode('CLAUDE-AUTH', loginUrl)
            }

            openUrl(loginUrl).catch(() => {
                // Intentionally swallowed: fallback to terminal prompt
            })

            const callbackResult = await server.waitForCallback()
            if (callbackResult.error) {
                throw new Error(
                    callbackResult.errorDescription ||
                        callbackResult.error ||
                        'Claude authorization was denied or failed.'
                )
            }

            const code = callbackResult.code
            if (!code) {
                throw new Error('No authorization code returned from Claude authorization server.')
            }

            const tokenRes = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: CLIENT_ID,
                    code,
                    state: callbackResult.state || pkce.state,
                    redirect_uri: REDIRECT_URI,
                    code_verifier: pkce.codeVerifier,
                }),
            })

            if (!tokenRes.ok) {
                const errText = await tokenRes.text().catch(() => '')
                throw new Error(`Claude token exchange failed (${tokenRes.status}): ${errText}`)
            }

            const tokenData = (await tokenRes.json()) as any
            const accessToken = tokenData.access_token || tokenData.accessToken
            const refreshToken = tokenData.refresh_token || tokenData.refreshToken
            const expiresIn = tokenData.expires_in || 43200

            return {
                provider: 'claude',
                accessToken,
                refreshToken,
                expiresAt: Date.now() + expiresIn * 1000,
                subscriptionType: 'claude_pro',
                source: 'oauth_login',
                updatedAt: Date.now(),
                endpoint: DEFAULT_ENDPOINT,
            }
        } finally {
            if (server) {
                await server.close().catch(() => {
                    // Intentionally swallowed: cleanup server
                })
            }
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
