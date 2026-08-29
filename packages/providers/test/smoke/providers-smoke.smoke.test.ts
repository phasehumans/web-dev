import { describe, expect, it } from 'bun:test'

import * as providersModule from '../../src/index'

describe('Providers Subsystem Smoke Tests', () => {
    it('verifies all standard providers and subproviders can be imported and instantiated', () => {
        expect(providersModule.OpenAIProvider).toBeDefined()
        expect(providersModule.AnthropicProvider).toBeDefined()
        expect(providersModule.GeminiProvider).toBeDefined()
        expect(providersModule.OllamaProvider).toBeDefined()
        expect(providersModule.openrouterProvider).toBeDefined()
        expect(providersModule.DeepSeekProvider).toBeDefined()
        expect(providersModule.GroqProvider).toBeDefined()
        expect(providersModule.MistralProvider).toBeDefined()
        expect(providersModule.KimiProvider).toBeDefined()
        expect(providersModule.MoonshotProvider).toBeDefined()
        expect(providersModule.XAIProvider).toBeDefined()
        expect(providersModule.ZAIProvider).toBeDefined()
        expect(providersModule.HuggingFaceProvider).toBeDefined()
        expect(providersModule.AgentRouterProvider).toBeDefined()

        const openai = new providersModule.OpenAIProvider('test-key')
        expect(openai.id).toBe('openai')

        const anthropic = new providersModule.AnthropicProvider('test-key')
        expect(anthropic.id).toBe('anthropic')

        const gemini = new providersModule.GeminiProvider('test-key')
        expect(gemini.id).toBe('gemini')
    })
})
