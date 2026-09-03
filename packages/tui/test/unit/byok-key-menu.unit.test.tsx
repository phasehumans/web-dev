import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { ByokKeyMenu, formatProviderName } from '../../src/components/menus/byok-key-menu'

describe('ByokKeyMenu Component (Unit)', () => {
    it('formats known and unknown provider names correctly', () => {
        expect(formatProviderName('openai')).toBe('OpenAI')
        expect(formatProviderName('anthropic')).toBe('Anthropic')
        expect(formatProviderName('claude')).toBe('Anthropic')
        expect(formatProviderName('codex')).toBe('OpenAI')
        expect(formatProviderName('google')).toBe('Google')
        expect(formatProviderName('openrouter')).toBe('OpenRouter')
        expect(formatProviderName('agentrouter')).toBe('AgentRouter')
        expect(formatProviderName('deepseek')).toBe('DeepSeek')
        expect(formatProviderName('groq')).toBe('Groq')
        expect(formatProviderName('ollama')).toBe('Ollama')
        expect(formatProviderName('custom_provider')).toBe('Custom_provider')
        expect(formatProviderName()).toBe('Provider')
    })

    it('renders default input state with formatted provider name and footer', () => {
        const handleKeySubmit = mock()
        const setApiKey = mock()
        const { lastFrame } = render(
            <ByokKeyMenu
                selectedProvider="openai"
                apiKey="sk-test-12345"
                setApiKey={setApiKey}
                handleKeySubmit={handleKeySubmit}
                isStreaming={false}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Enter API Key for OpenAI:')
        expect(output).toContain("Don't have an API key? Get one at")
        expect(output).toContain('https://platform.openai.com/api-keys')
        expect(output).toContain('sk-test-12345')
        expect(output).toContain('Submit')
        expect(output).toContain('Cancel')
        expect(output).not.toContain('Verifying and saving API key')
    })

    it('renders AgentRouter provider state with correct URL and API key placeholder', () => {
        const handleKeySubmit = mock()
        const setApiKey = mock()
        const { lastFrame } = render(
            <ByokKeyMenu
                selectedProvider="agentrouter"
                apiKey="sk-ar-test"
                setApiKey={setApiKey}
                handleKeySubmit={handleKeySubmit}
                isStreaming={false}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Enter API Key for AgentRouter:')
        expect(output).toContain("Don't have an API key? Get one at")
        expect(output).toContain('https://agentrouter.org/console/token')
        expect(output).toContain('sk-ar-test')
        expect(output).toContain('Submit')
        expect(output).toContain('Cancel')
    })

    it('renders saving loader spinner mid-step and hides footer when isStreaming is true', () => {
        const handleKeySubmit = mock()
        const setApiKey = mock()
        const { lastFrame } = render(
            <ByokKeyMenu
                selectedProvider="anthropic"
                apiKey="sk-ant-test"
                setApiKey={setApiKey}
                handleKeySubmit={handleKeySubmit}
                isStreaming={true}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Enter API Key for Anthropic:')
        expect(output).toContain('Verifying and saving API key for Anthropic...')
        expect(output).not.toContain('Submit')
        expect(output).not.toContain('Cancel')
    })

    it('renders error message when authError is passed and isStreaming is false', () => {
        const handleKeySubmit = mock()
        const setApiKey = mock()
        const { lastFrame } = render(
            <ByokKeyMenu
                selectedProvider="google"
                apiKey="bad-key"
                setApiKey={setApiKey}
                handleKeySubmit={handleKeySubmit}
                isStreaming={false}
                authError="Invalid API Key for google: 401 Unauthorized"
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Enter API Key for Google:')
        expect(output).toContain('Invalid API Key for google: 401 Unauthorized')
        expect(output).toContain('Submit')
        expect(output).toContain('Cancel')
    })
})
