import {
    OpenAIProvider,
    AnthropicProvider,
    GeminiProvider,
    OllamaProvider,
    openrouterProvider,
    DeepSeekProvider,
    GroqProvider,
    MistralProvider,
    XAIProvider,
    ZAIProvider,
    KimiProvider,
    MoonshotProvider,
    HuggingFaceProvider,
    AgentRouterProvider,
    getModelContextWindow,
    getAllProviders,
} from '@december/providers'
import { describe, expect, it } from 'bun:test'

describe('Providers Subsystem Monorepo Smoke Tests', () => {
    it('instantiates all provider classes and factory functions with test keys', () => {
        expect(new OpenAIProvider({ apiKey: 'sk-test' })).toBeDefined()
        expect(new AnthropicProvider('sk-ant-test')).toBeDefined()
        expect(new GeminiProvider('ai-studio-test')).toBeDefined()
        expect(new OllamaProvider({ baseUrl: 'http://localhost:11434' })).toBeDefined()
        expect(openrouterProvider({ apiKey: 'sk-or-test' })).toBeDefined()
        expect(new DeepSeekProvider({ apiKey: 'sk-ds-test' })).toBeDefined()
        expect(new GroqProvider({ apiKey: 'gsk-test' })).toBeDefined()
        expect(new MistralProvider({ apiKey: 'mistral-test' })).toBeDefined()
        expect(new XAIProvider({ apiKey: 'xai-test' })).toBeDefined()
        expect(new ZAIProvider({ apiKey: 'zai-test' })).toBeDefined()
        expect(new KimiProvider({ apiKey: 'kimi-test' })).toBeDefined()
        expect(new MoonshotProvider({ apiKey: 'moonshot-test' })).toBeDefined()
        expect(new HuggingFaceProvider({ apiKey: 'hf-test' })).toBeDefined()
        expect(new AgentRouterProvider('sk-ar-test')).toBeDefined()
    })

    it('verifies context window mappings for major standard models', () => {
        expect(getModelContextWindow('gemini-3.7-flash')).toBe(1000000)
        expect(getModelContextWindow('claude-3-7-sonnet-latest')).toBe(200000)
        expect(getModelContextWindow('gpt-4o')).toBe(128000)
        expect(getModelContextWindow('o3-mini')).toBe(200000)
        expect(getModelContextWindow('deepseek-chat')).toBe(128000)
    })

    it('verifies registered providers in the global registry', () => {
        const providers = getAllProviders()
        expect(providers).toBeDefined()
    })
})
