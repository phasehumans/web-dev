import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { claudeAdapter } from '../src/auth/subscriptions/adapters/claude'
import { instantiateProvider } from '../src/utils/provider-factory'

describe('Claude Code OAuth & Subscription Integration (Unit)', () => {
    let originalEnv: NodeJS.ProcessEnv
    let originalFetch: typeof globalThis.fetch
    let testConfigDir: string

    beforeEach(async () => {
        originalFetch = globalThis.fetch
        testConfigDir = path.join(
            os.tmpdir(),
            `december-claude-test-${Date.now()}-${Math.random()}`
        )
        await fs.mkdir(testConfigDir, { recursive: true })
        originalEnv = { ...process.env }
        process.env.DECEMBER_CONFIG_DIR = testConfigDir
        delete process.env.CLAUDE_CODE_OAUTH_TOKEN
        delete process.env.ANTHROPIC_AUTH_TOKEN
        delete process.env.ANTHROPIC_API_KEY
    })

    afterEach(async () => {
        globalThis.fetch = originalFetch
        process.env = originalEnv
        vi.restoreAllMocks()
        try {
            await fs.rm(testConfigDir, { recursive: true, force: true })
        } catch {
            // Intentionally swallowed: test cleanup
        }
    })

    it('refreshes Claude OAuth token using platform.claude.com and client ID 9d1c250a-e61b-44d9-88ed-5944d1962f5e', async () => {
        let capturedUrl = ''
        let capturedBody: any = null

        globalThis.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
            capturedUrl = String(url)
            capturedBody = JSON.parse(opts?.body || '{}')
            return new Response(
                JSON.stringify({
                    access_token: 'sk-ant-refreshed-oauth-token',
                    refresh_token: 'sk-ant-new-refresh-token',
                    expires_in: 43200,
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            )
        }) as any

        const initialBundle = {
            provider: 'claude',
            accessToken: 'sk-ant-old-token',
            refreshToken: 'sk-ant-old-refresh',
            expiresAt: Date.now() - 1000,
            subscriptionType: 'claude_pro',
            updatedAt: Date.now() - 5000,
        }

        const refreshed = await claudeAdapter.refreshToken(initialBundle)
        expect(capturedUrl).toBe('https://platform.claude.com/v1/oauth/token')
        expect(capturedBody.client_id).toBe('9d1c250a-e61b-44d9-88ed-5944d1962f5e')
        expect(capturedBody.grant_type).toBe('refresh_token')
        expect(capturedBody.refresh_token).toBe('sk-ant-old-refresh')

        expect(refreshed.accessToken).toBe('sk-ant-refreshed-oauth-token')
        expect(refreshed.refreshToken).toBe('sk-ant-new-refresh-token')
        expect(refreshed.expiresAt).toBeGreaterThan(Date.now())
    })

    it('instantiates claude provider via provider-factory with oauth-2024-11-18 beta header for subscription', () => {
        const bundle = {
            provider: 'claude',
            accessToken: 'test-claude-oauth-token',
            subscriptionType: 'claude_pro',
            updatedAt: Date.now(),
        }

        const provider = instantiateProvider('claude', bundle.accessToken, {
            authMethod: 'subscription',
            subscription: bundle,
        })

        expect(provider.id).toBe('anthropic')
        expect(typeof provider.stream).toBe('function')
    })
})
