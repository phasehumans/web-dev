import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { openUrl } from '../../../utils/open'
import { generatePKCE, startLocalOAuthServer } from '../oauth-server'

import type { SubscriptionAdapter, SubscriptionTokenBundle } from '../types'

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'
const AUTH_BASE_URL = 'https://auth.openai.com'
const AUTHORIZE_URL = `${AUTH_BASE_URL}/oauth/authorize`
const TOKEN_URL = `${AUTH_BASE_URL}/oauth/token`
const REDIRECT_URI = 'http://localhost:1455/auth/callback'
const DEVICE_USER_CODE_URL = `${AUTH_BASE_URL}/api/accounts/deviceauth/usercode`
const DEVICE_TOKEN_URL = `${AUTH_BASE_URL}/api/accounts/deviceauth/token`
const DEVICE_VERIFICATION_URI = `${AUTH_BASE_URL}/codex/device`
const DEVICE_REDIRECT_URI = `${AUTH_BASE_URL}/deviceauth/callback`
const SCOPE = 'openid profile email offline_access'
const DEFAULT_ENDPOINT = 'https://chatgpt.com/backend-api'

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.')
        if (parts.length === 3) {
            const decoded = Buffer.from(parts[1], 'base64url').toString('utf-8')
            return JSON.parse(decoded)
        }
    } catch {
        // Intentionally swallowed: invalid base64url token
    }
    return null
}

function parsePlanType(plan?: string): string {
    if (!plan) return 'chatgpt_plus'
    const norm = plan.toLowerCase()
    if (norm === 'pro') return 'chatgpt_pro'
    if (norm === 'team') return 'chatgpt_team'
    if (norm === 'go') return 'chatgpt_go'
    return 'chatgpt_plus'
}

export const codexAdapter: SubscriptionAdapter = {
    provider: 'codex',
    displayName: 'OpenAI Codex / ChatGPT Subscription',

    async detectLocal(): Promise<SubscriptionTokenBundle | null> {
        // 1. Check environment variables (only OAuth / subscription tokens, NOT BYOK API keys)
        const envToken =
            process.env.OPENAI_OAUTH_TOKEN ||
            process.env.CODEX_TOKEN ||
            process.env.OPENAI_CODEX_TOKEN
        if (envToken) {
            const payload = decodeJwtPayload(envToken)
            const authClaim = payload?.['https://api.openai.com/auth']
            const profileClaim = payload?.['https://api.openai.com/profile']

            return {
                provider: 'codex',
                accessToken: envToken,
                subscriptionType: parsePlanType(authClaim?.chatgpt_plan_type),
                email: profileClaim?.email,
                source: 'env',
                updatedAt: Date.now(),
                endpoint: DEFAULT_ENDPOINT,
                extra: {
                    accountId: authClaim?.chatgpt_account_id,
                    planType: authClaim?.chatgpt_plan_type,
                },
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
                    parsed.tokens?.access_token ||
                    parsed.tokens?.accessToken ||
                    parsed.access_token ||
                    parsed.accessToken ||
                    parsed.session_token

                if (accessToken) {
                    const payload = decodeJwtPayload(accessToken)
                    const authClaim = payload?.['https://api.openai.com/auth']
                    const profileClaim = payload?.['https://api.openai.com/profile']

                    const plan =
                        authClaim?.chatgpt_plan_type ||
                        parsed.plan ||
                        parsed.subscription_type ||
                        parsed.subscriptionType

                    return {
                        provider: 'codex',
                        accessToken,
                        refreshToken:
                            parsed.tokens?.refresh_token ||
                            parsed.refresh_token ||
                            parsed.refreshToken,
                        expiresAt:
                            parsed.tokens?.expires_at || parsed.expires_at || parsed.expiresAt,
                        email: profileClaim?.email || parsed.user?.email || parsed.email,
                        accountName: parsed.user?.name || parsed.name,
                        subscriptionType: parsePlanType(plan),
                        source: 'local_import',
                        updatedAt: Date.now(),
                        endpoint: DEFAULT_ENDPOINT,
                        extra: {
                            filePath,
                            accountId: authClaim?.chatgpt_account_id,
                            planType: authClaim?.chatgpt_plan_type || plan,
                        },
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
            const res = await fetch(TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: bundle.refreshToken,
                    client_id: CLIENT_ID,
                }),
            })

            if (res.ok) {
                const data = (await res.json()) as any
                const newAccessToken = data.access_token || data.accessToken
                const newRefreshToken = data.refresh_token || bundle.refreshToken
                const expiresIn = data.expires_in || 3600

                const payload = decodeJwtPayload(newAccessToken)
                const authClaim = payload?.['https://api.openai.com/auth']
                const profileClaim = payload?.['https://api.openai.com/profile']

                return {
                    ...bundle,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    expiresAt: Date.now() + expiresIn * 1000,
                    updatedAt: Date.now(),
                    email: profileClaim?.email || bundle.email,
                    subscriptionType: parsePlanType(
                        authClaim?.chatgpt_plan_type || bundle.subscriptionType
                    ),
                    endpoint: bundle.endpoint || DEFAULT_ENDPOINT,
                    extra: {
                        ...(bundle.extra || {}),
                        accountId: authClaim?.chatgpt_account_id || bundle.extra?.accountId,
                        planType: authClaim?.chatgpt_plan_type || bundle.extra?.planType,
                    },
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
        const pkce = generatePKCE()

        // Attempt local OAuth HTTP server on port 1455 for browser redirect
        let localServer: Awaited<ReturnType<typeof startLocalOAuthServer>> | null = null
        try {
            localServer = await startLocalOAuthServer({
                port: 1455,
                path: '/auth/callback',
                timeoutMs: 180000,
            })
        } catch {
            // Intentionally swallowed: port 1455 cannot bind or in restricted environment; fall back to device code
            localServer = null
        }

        if (localServer) {
            try {
                const authUrl = new URL(AUTHORIZE_URL)
                authUrl.searchParams.set('response_type', 'code')
                authUrl.searchParams.set('client_id', CLIENT_ID)
                authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
                authUrl.searchParams.set('scope', SCOPE)
                authUrl.searchParams.set('code_challenge', pkce.codeChallenge)
                authUrl.searchParams.set('code_challenge_method', 'S256')
                authUrl.searchParams.set('state', pkce.state)
                authUrl.searchParams.set('id_token_add_organizations', 'true')
                authUrl.searchParams.set('codex_cli_simplified_flow', 'true')
                authUrl.searchParams.set('originator', 'december')

                onCode?.('', authUrl.toString())
                try {
                    await openUrl(authUrl.toString())
                } catch {
                    // Intentionally swallowed: browser launch failed; URL was reported via onCode
                }

                const callbackResult = await localServer.waitForCallback()
                if (callbackResult.error) {
                    throw new Error(
                        `OpenAI authentication failed: ${callbackResult.errorDescription || callbackResult.error}`
                    )
                }
                if (!callbackResult.code) {
                    throw new Error('No authorization code received from OpenAI callback.')
                }

                const tokenRes = await fetch(TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: CLIENT_ID,
                        code: callbackResult.code,
                        code_verifier: pkce.codeVerifier,
                        redirect_uri: REDIRECT_URI,
                    }),
                })

                if (!tokenRes.ok) {
                    const errorText = await tokenRes.text().catch(() => '')
                    throw new Error(
                        `Failed to exchange authorization code with OpenAI (${tokenRes.status}): ${errorText}`
                    )
                }

                const tokenData = (await tokenRes.json()) as any
                const accessToken = tokenData.access_token
                const refreshToken = tokenData.refresh_token
                const expiresIn = tokenData.expires_in || 3600

                const payload = decodeJwtPayload(accessToken)
                const authClaim = payload?.['https://api.openai.com/auth']
                const profileClaim = payload?.['https://api.openai.com/profile']

                return {
                    provider: 'codex',
                    accessToken,
                    refreshToken,
                    expiresAt: Date.now() + expiresIn * 1000,
                    email: profileClaim?.email,
                    subscriptionType: parsePlanType(authClaim?.chatgpt_plan_type),
                    source: 'oauth_login',
                    updatedAt: Date.now(),
                    endpoint: DEFAULT_ENDPOINT,
                    extra: {
                        accountId: authClaim?.chatgpt_account_id,
                        planType: authClaim?.chatgpt_plan_type,
                    },
                }
            } finally {
                await localServer.close()
            }
        }

        // Device code flow fallback
        const deviceRes = await fetch(DEVICE_USER_CODE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: CLIENT_ID }),
        })

        if (!deviceRes.ok) {
            const errText = await deviceRes.text().catch(() => '')
            throw new Error(
                `OpenAI device authentication request failed (${deviceRes.status}): ${errText}`
            )
        }

        const deviceData = (await deviceRes.json()) as any
        const { device_auth_id, user_code, interval } = deviceData
        const pollIntervalMs =
            (typeof interval === 'number' ? interval : Number(interval) || 5) * 1000

        onCode?.(user_code, DEVICE_VERIFICATION_URI)
        try {
            await openUrl(DEVICE_VERIFICATION_URI)
        } catch {
            // Intentionally swallowed: browser launch failed; URI and code were reported via onCode
        }

        const maxWaitMs = 15 * 60 * 1000
        const start = Date.now()
        let authCode: string | null = null
        let codeVerifier: string | null = null

        while (Date.now() - start < maxWaitMs) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
            try {
                const pollRes = await fetch(DEVICE_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_auth_id,
                        user_code,
                    }),
                })

                if (pollRes.ok) {
                    const pollData = (await pollRes.json()) as any
                    if (pollData.authorization_code && pollData.code_verifier) {
                        authCode = pollData.authorization_code
                        codeVerifier = pollData.code_verifier
                        break
                    }
                } else if (pollRes.status === 403 || pollRes.status === 404) {
                    // Pending user approval
                    continue
                } else {
                    const errBody = (await pollRes.json().catch(() => ({}))) as any
                    if (errBody?.error?.code === 'deviceauth_authorization_pending') {
                        continue
                    }
                }
            } catch {
                // Intentionally swallowed: transient network glitch during polling
            }
        }

        if (!authCode || !codeVerifier) {
            throw new Error('OpenAI device code authentication timed out')
        }

        const exchangeRes = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                code: authCode,
                code_verifier: codeVerifier,
                redirect_uri: DEVICE_REDIRECT_URI,
            }),
        })

        if (!exchangeRes.ok) {
            const errText = await exchangeRes.text().catch(() => '')
            throw new Error(
                `Failed to exchange OpenAI device code (${exchangeRes.status}): ${errText}`
            )
        }

        const tokenData = (await exchangeRes.json()) as any
        const accessToken = tokenData.access_token
        const refreshToken = tokenData.refresh_token
        const expiresIn = tokenData.expires_in || 3600

        const payload = decodeJwtPayload(accessToken)
        const authClaim = payload?.['https://api.openai.com/auth']
        const profileClaim = payload?.['https://api.openai.com/profile']

        return {
            provider: 'codex',
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000,
            email: profileClaim?.email,
            subscriptionType: parsePlanType(authClaim?.chatgpt_plan_type),
            source: 'oauth_login',
            updatedAt: Date.now(),
            endpoint: DEFAULT_ENDPOINT,
            extra: {
                accountId: authClaim?.chatgpt_account_id,
                planType: authClaim?.chatgpt_plan_type,
            },
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
