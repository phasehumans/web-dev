import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { codexAdapter } from '../src/auth/subscriptions/adapters/codex'
import { instantiateProvider } from '../src/utils/provider-factory'

describe('OpenAI Codex OAuth & Subscription Integration (Unit)', () => {
    let originalEnv: NodeJS.ProcessEnv
    let originalFetch: typeof globalThis.fetch
    let testConfigDir: string

    beforeEach(async () => {
        originalFetch = globalThis.fetch
        testConfigDir = path.join(os.tmpdir(), `december-codex-test-${Date.now()}-${Math.random()}`)
        await fs.mkdir(testConfigDir, { recursive: true })
        originalEnv = { ...process.env }
        process.env.DECEMBER_CONFIG_DIR = testConfigDir
        delete process.env.OPENAI_OAUTH_TOKEN
        delete process.env.CODEX_TOKEN
        delete process.env.OPENAI_CODEX_TOKEN
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

    it('extracts accountId and planType from decoded JWT on detectLocal', async () => {
        const payload = {
            'https://api.openai.com/auth': {
                chatgpt_account_id: 'chatgpt-acc-xyz-123',
                chatgpt_plan_type: 'go',
            },
            'https://api.openai.com/profile': {
                email: 'user@chatgpt.com',
            },
        }
        const jwt = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

        vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
            if (String(targetPath).includes('.codex')) {
                return JSON.stringify({
                    tokens: {
                        access_token: jwt,
                        refresh_token: 'rt-test-999',
                        expires_at: Date.now() + 3600000,
                    },
                })
            }
            throw new Error('ENOENT')
        })

        const bundle = await codexAdapter.detectLocal()
        expect(bundle).not.toBeNull()
        expect(bundle?.provider).toBe('codex')
        expect(bundle?.email).toBe('user@chatgpt.com')
        expect(bundle?.subscriptionType).toBe('chatgpt_go')
        expect(bundle?.endpoint).toBe('https://chatgpt.com/backend-api')
        expect(bundle?.extra?.accountId).toBe('chatgpt-acc-xyz-123')
        expect(bundle?.extra?.planType).toBe('go')
    })

    it('refreshes token using auth.openai.com and client_id app_EMoamEEZ73f0CkXaXp7hrann', async () => {
        const newPayload = {
            'https://api.openai.com/auth': {
                chatgpt_account_id: 'refreshed-acc-id',
                chatgpt_plan_type: 'pro',
            },
            'https://api.openai.com/profile': {
                email: 'refreshed@chatgpt.com',
            },
        }
        const newJwt = `hdr.${Buffer.from(JSON.stringify(newPayload)).toString('base64url')}.sig`

        let capturedUrl = ''
        let capturedBody: any = null

        globalThis.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
            capturedUrl = String(url)
            capturedBody = opts?.body ? new URLSearchParams(opts.body).toString() : ''
            return new Response(
                JSON.stringify({
                    access_token: newJwt,
                    refresh_token: 'rt-new-123',
                    expires_in: 7200,
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            )
        }) as any

        const initialBundle = {
            provider: 'codex',
            accessToken: 'old-token',
            refreshToken: 'rt-old-999',
            expiresAt: Date.now() - 1000,
            subscriptionType: 'chatgpt_plus',
            updatedAt: Date.now() - 5000,
        }

        const refreshed = await codexAdapter.refreshToken(initialBundle)
        expect(capturedUrl).toBe('https://auth.openai.com/oauth/token')
        expect(capturedBody).toContain('client_id=app_EMoamEEZ73f0CkXaXp7hrann')
        expect(capturedBody).toContain('grant_type=refresh_token')
        expect(capturedBody).toContain('refresh_token=rt-old-999')

        expect(refreshed.accessToken).toBe(newJwt)
        expect(refreshed.refreshToken).toBe('rt-new-123')
        expect(refreshed.subscriptionType).toBe('chatgpt_pro')
        expect(refreshed.email).toBe('refreshed@chatgpt.com')
        expect(refreshed.extra?.accountId).toBe('refreshed-acc-id')
    })

    it('instantiates codex provider via provider-factory with backend-api endpoint and accountId', () => {
        const bundle = {
            provider: 'codex',
            accessToken: 'test-codex-token',
            subscriptionType: 'chatgpt_go',
            updatedAt: Date.now(),
            endpoint: 'https://chatgpt.com/backend-api',
            extra: {
                accountId: 'acc-uuid-888',
                planType: 'go',
            },
        }

        const provider = instantiateProvider('codex', bundle.accessToken, {
            authMethod: 'subscription',
            subscription: bundle,
            baseURL: bundle.endpoint,
        })

        expect(provider.id).toBe('codex')
        expect(typeof provider.stream).toBe('function')
    })
})
