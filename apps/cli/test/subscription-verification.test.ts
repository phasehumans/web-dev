import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi, beforeEach, afterEach } from 'bun:test'

import {
    verifyAndResolveSubscription,
    loginSubscription,
} from '../src/auth/subscriptions/subscription-manager'
import { loadConfig } from '../src/config'

describe('Subscription Verification & Provider Selection (Unit & Integration)', () => {
    const originalEnv = { ...process.env }
    const originalFetch = globalThis.fetch
    let testConfigDir: string

    beforeEach(async () => {
        testConfigDir = path.join(os.tmpdir(), `december-sub-test-${Date.now()}-${Math.random()}`)
        await fs.mkdir(testConfigDir, { recursive: true })
        process.env = { ...originalEnv }
        process.env.HOME = testConfigDir
        process.env.USERPROFILE = testConfigDir
        delete process.env.CLAUDE_CODE_OAUTH_TOKEN
        delete process.env.ANTHROPIC_AUTH_TOKEN
        delete process.env.COPILOT_TOKEN
        delete process.env.GITHUB_COPILOT_TOKEN
        delete process.env.GITHUB_TOKEN
        delete process.env.OPENAI_OAUTH_TOKEN
        delete process.env.CODEX_TOKEN
        delete process.env.OPENAI_CODEX_TOKEN
        delete process.env.GEMINI_OAUTH_TOKEN
        delete process.env.ANTIGRAVITY_TOKEN
        delete process.env.GOOGLE_OAUTH_TOKEN
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS
        globalThis.fetch = originalFetch
    })

    afterEach(async () => {
        process.env = { ...originalEnv }
        globalThis.fetch = originalFetch
        try {
            await fs.rm(testConfigDir, { recursive: true, force: true })
        } catch {
            // Intentionally swallowed: cleanup test dir
        }
    })

    it('auto-detects, verifies, and resolves local Claude Code credentials', async () => {
        // Mock ~/.claude/.credentials.json
        const claudeDir = path.join(testConfigDir, '.claude')
        await fs.mkdir(claudeDir, { recursive: true })
        await fs.writeFile(
            path.join(claudeDir, '.credentials.json'),
            JSON.stringify({
                claudeAiOauth: {
                    accessToken: 'sk-ant-valid-token',
                    refreshToken: 'sk-ant-refresh-token',
                    expiresAt: Date.now() + 3600 * 1000,
                    subscriptionType: 'claude_pro',
                    account: { email: 'developer@example.com', name: 'Claude Dev' },
                },
            }),
            'utf-8'
        )

        const bundle = await verifyAndResolveSubscription('claude')
        expect(bundle).not.toBeNull()
        expect(bundle?.provider).toBe('claude')
        expect(bundle?.accessToken).toBe('sk-ant-valid-token')
        expect(bundle?.subscriptionType).toBe('claude_pro')
        expect(bundle?.email).toBe('developer@example.com')

        const config = await loadConfig()
        expect(config.subscriptions?.claude?.accessToken).toBe('sk-ant-valid-token')
        expect(config.activeProvider).toBe('claude')
    })

    it('auto-detects, verifies, and resolves local GitHub Copilot credentials', async () => {
        const copilotDir = path.join(testConfigDir, '.config', 'github-copilot')
        await fs.mkdir(copilotDir, { recursive: true })
        await fs.writeFile(
            path.join(copilotDir, 'hosts.json'),
            JSON.stringify({
                'github.com': {
                    user: 'octocat',
                    oauth_token: 'gho_valid_copilot_token',
                },
            }),
            'utf-8'
        )

        globalThis.fetch = vi.fn().mockImplementation(async (url: any) => {
            if (String(url).includes('copilot_internal/v2/token')) {
                return new Response(
                    JSON.stringify({
                        token: 'tid=verified_copilot_token;exp=1899999999;sku=copilot_individual',
                        expires_at: Math.floor(Date.now() / 1000) + 1800,
                        endpoints: { api: 'https://api.individual.githubcopilot.com' },
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            throw new Error(`Unexpected URL: ${url}`)
        }) as any

        const bundle = await verifyAndResolveSubscription('copilot')
        expect(bundle).not.toBeNull()
        expect(bundle?.provider).toBe('copilot')
        expect(bundle?.accessToken).toBe(
            'tid=verified_copilot_token;exp=1899999999;sku=copilot_individual'
        )
        expect(bundle?.endpoint).toBe('https://api.individual.githubcopilot.com')
        expect(bundle?.accountName).toBe('octocat')

        const config = await loadConfig()
        expect(config.subscriptions?.copilot?.accessToken).toBe(
            'tid=verified_copilot_token;exp=1899999999;sku=copilot_individual'
        )
        expect(config.activeProvider).toBe('copilot')
    })

    it('auto-detects, verifies, and resolves local OpenAI Codex credentials', async () => {
        const codexDir = path.join(testConfigDir, '.codex')
        await fs.mkdir(codexDir, { recursive: true })
        await fs.writeFile(
            path.join(codexDir, 'auth.json'),
            JSON.stringify({
                tokens: {
                    access_token: 'codex-valid-access-token',
                    refresh_token: 'codex-valid-refresh-token',
                    expires_at: Date.now() + 3600 * 1000,
                },
                plan: 'pro',
                user: { email: 'codex@openai.com' },
            }),
            'utf-8'
        )

        const bundle = await verifyAndResolveSubscription('codex')
        expect(bundle).not.toBeNull()
        expect(bundle?.provider).toBe('codex')
        expect(bundle?.accessToken).toBe('codex-valid-access-token')
        expect(bundle?.subscriptionType).toBe('chatgpt_pro')

        const config = await loadConfig()
        expect(config.subscriptions?.codex?.accessToken).toBe('codex-valid-access-token')
        expect(config.activeProvider).toBe('codex')
    })

    it('returns null if no credentials exist and verification cannot proceed', async () => {
        const bundle = await verifyAndResolveSubscription('claude')
        expect(bundle).toBeNull()
    })

    it('performs interactive login and subscription verification flow', async () => {
        let codeReceived = ''
        let uriReceived = ''

        globalThis.fetch = vi.fn().mockImplementation(async (url: any) => {
            if (String(url).includes('login/device/code')) {
                return new Response(
                    JSON.stringify({
                        device_code: 'dev-1234',
                        user_code: 'COPILOT-CODE',
                        verification_uri: 'https://github.com/login/device',
                        expires_in: 900,
                        interval: 1,
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            if (String(url).includes('login/oauth/access_token')) {
                return new Response(
                    JSON.stringify({
                        access_token: 'gho_new_token',
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            if (String(url).includes('copilot_internal/v2/token')) {
                return new Response(
                    JSON.stringify({
                        token: 'tid=new_copilot_token;exp=1899999999',
                        expires_at: Math.floor(Date.now() / 1000) + 1800,
                        endpoints: { api: 'https://api.individual.githubcopilot.com' },
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            }
            throw new Error(`Unexpected URL: ${url}`)
        }) as any

        const bundle = await loginSubscription('copilot', (code, uri) => {
            codeReceived = code
            uriReceived = uri
        })

        expect(bundle).toBeDefined()
        expect(bundle.provider).toBe('copilot')
        expect(bundle.accessToken).toBe('tid=new_copilot_token;exp=1899999999')
        expect(codeReceived).toBe('COPILOT-CODE')
        expect(uriReceived).toBe('https://github.com/login/device')

        const config = await loadConfig()
        expect(config.subscriptions?.copilot).toBeDefined()
        expect(config.activeProvider).toBe('copilot')
    })
})
