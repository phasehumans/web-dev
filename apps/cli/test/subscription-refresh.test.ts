import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { resolveSubscriptionToken } from '../src/auth/subscriptions/subscription-manager'

import type { SubscriptionTokenBundle } from '../src/auth/subscriptions/types'

describe('Subscription Token Refresh & Resolver Daemon (Unit)', () => {
    let originalFetch: typeof globalThis.fetch

    beforeEach(() => {
        originalFetch = globalThis.fetch
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('returns token unchanged if not expiring soon (> 5 minutes remaining)', async () => {
        const bundle: SubscriptionTokenBundle = {
            provider: 'claude',
            accessToken: 'sk-ant-valid-token',
            refreshToken: 'sk-ant-refresh-token',
            expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour left
            subscriptionType: 'claude_pro',
        }

        const resolved = await resolveSubscriptionToken('claude', bundle)
        expect(resolved.accessToken).toBe('sk-ant-valid-token')
        expect(resolved.expiresAt).toBe(bundle.expiresAt)
    })

    it('triggers automatic refresh if token expires within 5 minutes', async () => {
        const bundle: SubscriptionTokenBundle = {
            provider: 'claude',
            accessToken: 'sk-ant-expiring-token',
            refreshToken: 'sk-ant-refresh-token',
            expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes left (less than 5 min)
            subscriptionType: 'claude_pro',
        }

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    access_token: 'sk-ant-refreshed-token-123',
                    refresh_token: 'sk-ant-new-refresh-token-456',
                    expires_in: 3600,
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            )
        ) as any

        const resolved = await resolveSubscriptionToken('claude', bundle)
        expect(resolved.accessToken).toBe('sk-ant-refreshed-token-123')
        expect(resolved.refreshToken).toBe('sk-ant-new-refresh-token-456')
        expect(resolved.expiresAt).toBeGreaterThan(Date.now() + 3000 * 1000)
    })

    it('exchanges GitHub OAuth token for Copilot session token automatically', async () => {
        const bundle: SubscriptionTokenBundle = {
            provider: 'copilot',
            accessToken: 'gho_oauth_token',
            subscriptionType: 'copilot',
        }

        globalThis.fetch = vi.fn().mockImplementation(async (url: any) => {
            if (String(url).includes('copilot_internal/v2/token')) {
                return new Response(
                    JSON.stringify({
                        token: 'tid=copilot_session_bearer_token;exp=1799999999;sku=copilot_for_business',
                        expires_at: Math.floor(Date.now() / 1000) + 1800,
                        endpoints: { api: 'https://api.individual.githubcopilot.com' },
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            throw new Error(`Unexpected URL: ${url}`)
        }) as any

        const resolved = await resolveSubscriptionToken('copilot', bundle)
        expect(resolved.accessToken).toBe(
            'tid=copilot_session_bearer_token;exp=1799999999;sku=copilot_for_business'
        )
        expect(resolved.endpoint).toBe('https://api.individual.githubcopilot.com')
        expect(resolved.expiresAt).toBeGreaterThan(Date.now())
    })
})
