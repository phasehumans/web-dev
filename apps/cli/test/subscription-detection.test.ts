import fs from 'node:fs/promises'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { claudeAdapter } from '../src/auth/subscriptions/adapters/claude'
import { codexAdapter } from '../src/auth/subscriptions/adapters/codex'
import { copilotAdapter } from '../src/auth/subscriptions/adapters/copilot'
import { geminiAdapter } from '../src/auth/subscriptions/adapters/gemini'
import {
    detectAllSubscriptions,
    importLocalSubscriptions,
} from '../src/auth/subscriptions/subscription-manager'

describe('Subscription Detection & Local Import (Unit)', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = { ...process.env }
        delete process.env.CLAUDE_CODE_OAUTH_TOKEN
        delete process.env.ANTHROPIC_AUTH_TOKEN
        delete process.env.OPENAI_OAUTH_TOKEN
        delete process.env.CODEX_TOKEN
        delete process.env.COPILOT_TOKEN
        delete process.env.GITHUB_COPILOT_TOKEN
        delete process.env.GEMINI_OAUTH_TOKEN
        delete process.env.ANTIGRAVITY_TOKEN
    })

    afterEach(() => {
        process.env = originalEnv
        vi.restoreAllMocks()
    })

    describe('Claude Adapter Detection', () => {
        it('detects credentials from ~/.claude/.credentials.json', async () => {
            const mockData = JSON.stringify({
                claudeAiOauth: {
                    accessToken: 'sk-ant-oauth-12345',
                    refreshToken: 'sk-ant-refresh-67890',
                    expiresAt: Date.now() + 3600 * 1000,
                    account: { email: 'claude.user@example.com', name: 'Claude User' },
                    subscriptionType: 'claude_pro',
                },
            })

            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                if (String(targetPath).includes('.claude')) {
                    return mockData
                }
                throw new Error('ENOENT')
            })

            const result = await claudeAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('claude')
            expect(result?.accessToken).toBe('sk-ant-oauth-12345')
            expect(result?.refreshToken).toBe('sk-ant-refresh-67890')
            expect(result?.email).toBe('claude.user@example.com')
            expect(result?.subscriptionType).toBe('claude_pro')
            expect(result?.source).toBe('local_import')
        })

        it('detects credentials from environment variable CLAUDE_CODE_OAUTH_TOKEN', async () => {
            process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oauth-env-token'
            vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'))

            const result = await claudeAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('claude')
            expect(result?.accessToken).toBe('sk-ant-oauth-env-token')
            expect(result?.source).toBe('env')
        })
    })

    describe('Codex Adapter Detection', () => {
        it('detects credentials from ~/.codex/auth.json', async () => {
            const mockData = JSON.stringify({
                tokens: {
                    access_token: 'codex-access-token-999',
                    refresh_token: 'codex-refresh-token-888',
                    expires_at: Date.now() + 7200 * 1000,
                },
                user: {
                    email: 'openai.user@example.com',
                },
                plan: 'plus',
            })

            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                if (String(targetPath).includes('.codex')) {
                    return mockData
                }
                throw new Error('ENOENT')
            })

            const result = await codexAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('codex')
            expect(result?.accessToken).toBe('codex-access-token-999')
            expect(result?.refreshToken).toBe('codex-refresh-token-888')
            expect(result?.email).toBe('openai.user@example.com')
            expect(result?.subscriptionType).toBe('chatgpt_plus')
        })

        it('detects credentials from environment variable OPENAI_OAUTH_TOKEN', async () => {
            process.env.OPENAI_OAUTH_TOKEN = 'codex-env-token-777'
            vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'))

            const result = await codexAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('codex')
            expect(result?.accessToken).toBe('codex-env-token-777')
            expect(result?.source).toBe('env')
        })
    })

    describe('Copilot Adapter Detection', () => {
        it('detects credentials from ~/.config/github-copilot/hosts.json', async () => {
            const mockData = JSON.stringify({
                'github.com': {
                    user: 'octocat',
                    oauth_token: 'gho_copilot_token_12345',
                },
            })

            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                if (String(targetPath).includes('github-copilot')) {
                    return mockData
                }
                throw new Error('ENOENT')
            })

            const result = await copilotAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('copilot')
            expect(result?.accessToken).toBe('gho_copilot_token_12345')
            expect(result?.accountName).toBe('octocat')
            expect(result?.subscriptionType).toBe('copilot')
        })

        it('detects credentials from COPILOT_TOKEN env variable', async () => {
            process.env.COPILOT_TOKEN = 'gho_env_copilot_token'
            vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'))

            const result = await copilotAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('copilot')
            expect(result?.accessToken).toBe('gho_env_copilot_token')
            expect(result?.source).toBe('env')
        })
    })

    describe('Gemini / Antigravity Adapter Detection', () => {
        it('detects credentials from ~/.gemini/antigravity-cli/auth.json or gcloud ADC', async () => {
            const mockData = JSON.stringify({
                access_token: 'ya29.gemini-access-token',
                refresh_token: '1//gemini-refresh-token',
                token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
                client_id: 'mock-client-id',
                account: 'gemini.user@gmail.com',
            })

            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                if (
                    String(targetPath).includes('.gemini') ||
                    String(targetPath).includes('gcloud')
                ) {
                    return mockData
                }
                throw new Error('ENOENT')
            })

            const result = await geminiAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('gemini')
            expect(result?.accessToken).toBe('ya29.gemini-access-token')
            expect(result?.refreshToken).toBe('1//gemini-refresh-token')
            expect(result?.email).toBe('gemini.user@gmail.com')
            expect(result?.subscriptionType).toBe('gemini_advanced')
        })

        it('detects credentials from GEMINI_OAUTH_TOKEN env variable', async () => {
            process.env.GEMINI_OAUTH_TOKEN = 'gemini-env-token-xyz'
            vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'))

            const result = await geminiAdapter.detectLocal()
            expect(result).not.toBeNull()
            expect(result?.provider).toBe('gemini')
            expect(result?.accessToken).toBe('gemini-env-token-xyz')
            expect(result?.source).toBe('env')
        })
    })

    describe('Subscription Manager Auto-Detection & Import', () => {
        it('detects all available subscriptions across adapters', async () => {
            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                const p = String(targetPath)
                if (p.includes('.claude')) {
                    return JSON.stringify({
                        claudeAiOauth: {
                            accessToken: 'claude-tok',
                            subscriptionType: 'claude_pro',
                        },
                    })
                }
                if (p.includes('github-copilot')) {
                    return JSON.stringify({
                        'github.com': { user: 'copilot-user', oauth_token: 'gho-tok' },
                    })
                }
                throw new Error('ENOENT')
            })

            const subs = await detectAllSubscriptions()
            expect(Object.keys(subs)).toContain('claude')
            expect(Object.keys(subs)).toContain('copilot')
            expect(subs.claude.accessToken).toBe('claude-tok')
            expect(subs.copilot.accessToken).toBe('gho-tok')
        })

        it('importLocalSubscriptions summarizes imported subscriptions', async () => {
            vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
                const p = String(targetPath)
                if (p.includes('.codex')) {
                    return JSON.stringify({
                        tokens: { access_token: 'codex-tok' },
                    })
                }
                throw new Error('ENOENT')
            })

            const summary = await importLocalSubscriptions()
            expect(summary.imported).toContain('codex')
            expect(summary.bundles.codex.accessToken).toBe('codex-tok')
        })
    })
})
