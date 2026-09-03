import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

import { useAuthHandlers } from '../src/hooks/use-auth-handlers'
import { useCliStore } from '../src/store'

describe('BYOK Provider Selection vs Subscription Selection (Unit)', () => {
    const originalEnv = { ...process.env }
    let testConfigDir: string

    beforeEach(async () => {
        testConfigDir = path.join(os.tmpdir(), `december-byok-test-${Date.now()}-${Math.random()}`)
        await fs.mkdir(testConfigDir, { recursive: true })
        process.env = { ...originalEnv }
        process.env.HOME = testConfigDir
        process.env.USERPROFILE = testConfigDir
        process.env.DECEMBER_CONFIG_DIR = testConfigDir

        // Reset store state
        useCliStore.setState({
            authMode: 'none',
            selectedProvider: '',
            authMethod: undefined,
            isAuthenticated: false,
        })
    })

    afterEach(async () => {
        process.env = { ...originalEnv }
        try {
            await fs.rm(testConfigDir, { recursive: true, force: true })
        } catch {
            // Intentionally swallowed: cleanup test dir
        }
    })

    it('navigates to byok_provider menu when BYOK is selected from auth menu', async () => {
        const handlers = useAuthHandlers(null)
        await handlers.handleAuthMenuSelect({ value: 'byok' })
        expect(useCliStore.getState().authMode).toBe('byok_provider')
    })

    it('navigates to subscription_select menu when subscriptions is selected from auth menu', async () => {
        const handlers = useAuthHandlers(null)
        await handlers.handleAuthMenuSelect({ value: 'subscriptions' })
        expect(useCliStore.getState().authMode).toBe('subscription_select')
    })

    it('prompts for API key (byok_key) when selecting Anthropic in BYOK mode even if subscription credentials exist', async () => {
        // Even if local Claude credentials exist on disk
        const claudeDir = path.join(testConfigDir, '.claude')
        await fs.mkdir(claudeDir, { recursive: true })
        await fs.writeFile(
            path.join(claudeDir, '.credentials.json'),
            JSON.stringify({
                claudeAiOauth: {
                    accessToken: 'sk-ant-test-token',
                    subscriptionType: 'claude_pro',
                },
            }),
            'utf-8'
        )

        const handlers = useAuthHandlers(null)
        await handlers.handleProviderSelect({ label: 'Anthropic', value: 'anthropic' })

        // Must NOT auto-verify subscription or change authMethod to subscription
        expect(useCliStore.getState().authMode).toBe('byok_key')
        expect(useCliStore.getState().selectedProvider).toBe('anthropic')
        expect(useCliStore.getState().authMethod).not.toBe('subscription')
    })

    it('prompts for API key (byok_key) when selecting Google in BYOK mode', async () => {
        const handlers = useAuthHandlers(null)
        await handlers.handleProviderSelect({ label: 'Google AI Studio', value: 'google' })

        expect(useCliStore.getState().authMode).toBe('byok_key')
        expect(useCliStore.getState().selectedProvider).toBe('google')
        expect(useCliStore.getState().authMethod).not.toBe('subscription')
    })

    it('prompts for API key (byok_key) when selecting OpenAI in BYOK mode', async () => {
        const handlers = useAuthHandlers(null)
        await handlers.handleProviderSelect({ label: 'OpenAI', value: 'openai' })

        expect(useCliStore.getState().authMode).toBe('byok_key')
        expect(useCliStore.getState().selectedProvider).toBe('openai')
        expect(useCliStore.getState().authMethod).not.toBe('subscription')
    })

    it('prompts for API key (byok_key) when selecting AgentRouter in BYOK mode', async () => {
        const handlers = useAuthHandlers(null)
        await handlers.handleProviderSelect({ label: 'AgentRouter', value: 'agentrouter' })

        expect(useCliStore.getState().authMode).toBe('byok_key')
        expect(useCliStore.getState().selectedProvider).toBe('agentrouter')
        expect(useCliStore.getState().authMethod).not.toBe('subscription')
    })

    it('verifies local subscription credentials when handleSubscriptionSelect is used', async () => {
        // Setup local Claude credentials
        const claudeDir = path.join(testConfigDir, '.claude')
        await fs.mkdir(claudeDir, { recursive: true })
        await fs.writeFile(
            path.join(claudeDir, '.credentials.json'),
            JSON.stringify({
                claudeAiOauth: {
                    accessToken: 'sk-ant-test-token',
                    subscriptionType: 'claude_pro',
                },
            }),
            'utf-8'
        )

        const handlers = useAuthHandlers({
            setLLM: () => {},
            modelOptions: {},
        })
        await handlers.handleSubscriptionSelect({ label: 'Claude Code', value: 'claude' })

        // Subscription select should verify local subscription
        expect(useCliStore.getState().authMethod).toBe('subscription')
        expect(useCliStore.getState().selectedProvider).toBe('claude')
        expect(useCliStore.getState().authMode).toBe('none')
    })
})
