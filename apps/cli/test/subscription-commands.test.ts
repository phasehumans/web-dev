import fs from 'node:fs/promises'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { handleAuthCommand, handleLogoutCommand } from '../src/commands'
import * as configModule from '../src/config'

describe('Subscription CLI Commands (Unit)', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = { ...process.env }
    })

    afterEach(() => {
        process.env = originalEnv
        vi.restoreAllMocks()
    })

    it('handleAuthCommand action: status displays subscription status card', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
            subscriptions: {
                copilot: {
                    provider: 'copilot',
                    accessToken: 'tid=token',
                    subscriptionType: 'copilot',
                    expiresAt: Date.now() + 3600 * 1000,
                    accountName: 'octocat',
                },
            },
            providers: {},
            authPriority: 'subscription',
        })

        await handleAuthCommand({ action: 'status' })
        expect(consoleSpy).toHaveBeenCalled()
        const logs = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(logs.toLowerCase()).toContain('copilot')
    })

    it('handleAuthCommand action: import detects and stores local subscriptions', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        vi.spyOn(fs, 'readFile').mockImplementation(async (targetPath: any) => {
            if (String(targetPath).includes('.claude')) {
                return JSON.stringify({
                    claudeAiOauth: {
                        accessToken: 'sk-ant-oauth-import',
                        subscriptionType: 'claude_pro',
                    },
                })
            }
            throw new Error('ENOENT')
        })

        const saveSpy = vi.spyOn(configModule, 'saveConfig').mockResolvedValue(undefined as any)
        vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
            providers: {},
        })

        await handleAuthCommand({ action: 'import' })
        expect(saveSpy).toHaveBeenCalled()
        const savedConfig = saveSpy.mock.calls[0][0]
        expect(savedConfig.subscriptions?.claude?.accessToken).toBe('sk-ant-oauth-import')
    })

    it('handleLogoutCommand with provider removes specific subscription', async () => {
        const saveSpy = vi.spyOn(configModule, 'saveConfig').mockResolvedValue(undefined as any)
        vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
            subscriptions: {
                claude: { provider: 'claude', accessToken: 'token-claude' },
                copilot: { provider: 'copilot', accessToken: 'token-copilot' },
            },
            providers: {
                openai: 'sk-openai',
            },
            decemberToken: 'dec-token',
        })

        await handleLogoutCommand({ provider: 'claude' })
        expect(saveSpy).toHaveBeenCalled()
        const savedConfig = saveSpy.mock.calls[0][0]
        expect(savedConfig.subscriptions?.claude).toBeUndefined()
        expect(savedConfig.subscriptions?.copilot).toBeDefined()
        expect(savedConfig.providers?.openai).toBe('sk-openai')
    })
})
