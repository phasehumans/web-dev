import fs from 'node:fs/promises'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getProviderConfig, getAuthStatus, saveConfig } from '../src/config'

describe('Subscription Config & Priority Resolution Hierarchy (Unit)', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = { ...process.env }
        delete process.env.CLAUDE_CODE_OAUTH_TOKEN
        delete process.env.COPILOT_TOKEN
    })

    afterEach(() => {
        process.env = originalEnv
        vi.restoreAllMocks()
    })

    it('resolves subscription when authPriority is subscription or default with subscription configured', async () => {
        vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
            if (String(filePath).includes('settings.json')) throw new Error('ENOENT')
            return JSON.stringify({
                subscriptions: {
                    copilot: {
                        provider: 'copilot',
                        accessToken: 'tid=copilot-session-token',
                        subscriptionType: 'copilot',
                        expiresAt: Date.now() + 3600 * 1000,
                    },
                },
                activeProvider: 'copilot',
                providers: { openai: 'sk-byok-key' },
                decemberToken: 'dec-token',
            })
        })

        const providerConfig = await getProviderConfig()
        expect(providerConfig).toBeDefined()
        expect(providerConfig?.provider).toBe('copilot')
        expect(providerConfig?.authMethod).toBe('subscription')
        expect(providerConfig?.apiKey).toBe('tid=copilot-session-token')
    })

    it('respects authPriority: byok over subscription', async () => {
        vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
            if (String(filePath).includes('settings.json')) throw new Error('ENOENT')
            return JSON.stringify({
                authPriority: 'byok',
                subscriptions: {
                    claude: {
                        provider: 'claude',
                        accessToken: 'sk-ant-oauth-token',
                        subscriptionType: 'claude_pro',
                    },
                },
                activeProvider: 'anthropic',
                providers: { anthropic: 'sk-ant-byok-key' },
            })
        })

        const providerConfig = await getProviderConfig()
        expect(providerConfig?.authMethod).toBe('byok')
        expect(providerConfig?.provider).toBe('anthropic')
        expect(providerConfig?.apiKey).toBe('sk-ant-byok-key')
    })

    it('resolves BYOK for OpenAI when activeProvider is openai and codex subscription exists', async () => {
        vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
            if (String(filePath).includes('settings.json')) throw new Error('ENOENT')
            return JSON.stringify({
                authPriority: 'byok',
                subscriptions: {
                    codex: {
                        provider: 'codex',
                        accessToken: 'sk-openai-oauth-token',
                        subscriptionType: 'chatgpt_plus',
                    },
                },
                activeProvider: 'openai',
                providers: { openai: 'sk-openai-byok-key' },
            })
        })

        const providerConfig = await getProviderConfig()
        expect(providerConfig?.authMethod).toBe('byok')
        expect(providerConfig?.provider).toBe('openai')
        expect(providerConfig?.apiKey).toBe('sk-openai-byok-key')
    })

    it('respects authPriority: december over subscription and byok', async () => {
        vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
            if (String(filePath).includes('settings.json')) throw new Error('ENOENT')
            return JSON.stringify({
                authPriority: 'december',
                subscriptions: {
                    copilot: { provider: 'copilot', accessToken: 'tid-token' },
                },
                providers: { openai: 'sk-openai' },
                decemberToken: 'dec-token-123',
            })
        })

        const providerConfig = await getProviderConfig()
        expect(providerConfig?.authMethod).toBe('december')
        expect(providerConfig?.provider).toBe('december_proxy')
        expect(providerConfig?.apiKey).toBe('dec-token-123')
    })

    it('getAuthStatus reflects active subscriptions', async () => {
        vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
            if (String(filePath).includes('settings.json')) throw new Error('ENOENT')
            return JSON.stringify({
                subscriptions: {
                    claude: { provider: 'claude', accessToken: 'tok1' },
                    copilot: { provider: 'copilot', accessToken: 'tok2' },
                },
                providers: { openai: 'sk-openai' },
                authPriority: 'subscription',
            })
        })

        const status = await getAuthStatus()
        expect(status.hasSubscription).toBe(true)
        expect(status.hasByok).toBe(true)
        expect(status.hasDecember).toBe(false)
        expect(status.subscriptions).toEqual(['claude', 'copilot'])
    })

    it('saves config with restricted 0600 file permissions for security', async () => {
        const mkdirSpy = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any)
        const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined as any)
        const chmodSpy = vi.spyOn(fs, 'chmod').mockResolvedValue(undefined as any)

        await saveConfig({
            subscriptions: {
                claude: { provider: 'claude', accessToken: 'sk-secret' },
            },
            providers: {},
        })

        expect(writeFileSpy).toHaveBeenCalled()
        expect(chmodSpy).toHaveBeenCalledWith(expect.stringContaining('config.json'), 0o600)
    })
})
