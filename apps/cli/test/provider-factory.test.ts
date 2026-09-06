import * as providers from '@december/providers'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { instantiateProvider } from '../src/utils/provider-factory'

vi.mock('@december/providers', () => ({
    openaiProvider: vi.fn(),
    anthropicProvider: vi.fn(),
    geminiProvider: vi.fn(),
    antigravityProvider: vi.fn(),
    openrouterProvider: vi.fn(),
    ollamaProvider: vi.fn(),
}))

describe('instantiateProvider', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        vi.clearAllMocks()
        originalEnv = { ...process.env }
        ;(providers.openaiProvider as any).mockReturnValue('mock-openai')
        ;(providers.anthropicProvider as any).mockReturnValue('mock-anthropic')
        ;(providers.geminiProvider as any).mockReturnValue('mock-gemini')
        ;(providers.antigravityProvider as any).mockReturnValue('mock-antigravity')
        ;(providers.openrouterProvider as any).mockReturnValue('mock-openrouter')
        ;(providers.ollamaProvider as any).mockReturnValue('mock-ollama')
    })

    afterEach(() => {
        process.env = originalEnv
        vi.restoreAllMocks()
    })

    it('instantiates openai provider', () => {
        const p = instantiateProvider('openai', 'key-123')
        expect(p).toBe('mock-openai')
        expect(providers.openaiProvider).toHaveBeenCalledWith(undefined, 'key-123')
    })

    it('instantiates anthropic provider', () => {
        const p = instantiateProvider('anthropic', 'key-123')
        expect(p).toBe('mock-anthropic')
        expect(providers.anthropicProvider).toHaveBeenCalledWith(undefined, 'key-123')
    })

    it('instantiates gemini provider for BYOK API key', () => {
        const p = instantiateProvider('google', 'key-123')
        expect(p).toBe('mock-gemini')
        expect(providers.geminiProvider).toHaveBeenCalledWith('key-123')
    })

    it('instantiates antigravity provider for antigravity identifier', () => {
        const p = instantiateProvider('antigravity', 'ya29.token-123')
        expect(p).toBe('mock-antigravity')
        expect(providers.antigravityProvider).toHaveBeenCalledWith('ya29.token-123', {
            endpoint: undefined,
            headers: undefined,
        })
    })

    it('routes gemini subscription to antigravity provider', () => {
        const p = instantiateProvider('gemini', 'ya29.token-123', {
            authMethod: 'subscription',
        })
        expect(p).toBe('mock-antigravity')
        expect(providers.antigravityProvider).toHaveBeenCalledWith('ya29.token-123', {
            endpoint: undefined,
            headers: undefined,
        })
    })

    it('instantiates openrouter provider', () => {
        const p = instantiateProvider('openrouter', 'key-123')
        expect(p).toBe('mock-openrouter')
        expect(providers.openrouterProvider).toHaveBeenCalledWith('key-123')
    })

    it('instantiates deepseek provider via openai compat', () => {
        const p = instantiateProvider('deepseek', 'key-123')
        expect(p).toBe('mock-openai')
        expect(providers.openaiProvider).toHaveBeenCalledWith('https://api.deepseek.com', 'key-123')
    })

    it('instantiates groq provider via openai compat', () => {
        instantiateProvider('groq', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.groq.com/openai/v1',
            'key-123'
        )
    })

    it('instantiates moonshot provider via openai compat', () => {
        instantiateProvider('moonshot', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.moonshot.ai/v1',
            'key-123'
        )
    })

    it('instantiates zai provider via openai compat', () => {
        instantiateProvider('zai', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.z.ai/api/coding/paas/v4',
            'key-123'
        )
    })

    it('instantiates nvidia provider via openai compat', () => {
        instantiateProvider('nvidia', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://integrate.api.nvidia.com/v1',
            'key-123'
        )
    })

    it('instantiates sambanova provider via openai compat', () => {
        instantiateProvider('sambanova', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.sambanova.ai/v1',
            'key-123'
        )
    })

    it('instantiates cerebras provider via openai compat', () => {
        instantiateProvider('cerebras', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.cerebras.ai/v1',
            'key-123'
        )
    })

    it('instantiates siliconflow provider via openai compat', () => {
        instantiateProvider('siliconflow', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.siliconflow.cn/v1',
            'key-123'
        )
    })

    it('instantiates together provider via openai compat', () => {
        instantiateProvider('together', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.together.xyz/v1',
            'key-123'
        )
    })

    it('instantiates hyperbolic provider via openai compat', () => {
        instantiateProvider('hyperbolic', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.hyperbolic.xyz/v1',
            'key-123'
        )
    })

    it('instantiates fireworks provider via openai compat', () => {
        instantiateProvider('fireworks', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.fireworks.ai/inference/v1',
            'key-123'
        )
    })

    it('instantiates perplexity provider via openai compat', () => {
        instantiateProvider('perplexity', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.perplexity.ai',
            'key-123'
        )
    })

    it('instantiates cohere provider via openai compat', () => {
        instantiateProvider('cohere', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.cohere.com/v2',
            'key-123'
        )
    })

    it('instantiates agentrouter provider via openai compat', () => {
        instantiateProvider('agentrouter', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://agentrouter.org/v1',
            'key-123',
            { 'User-Agent': 'claude-cli/2.1.0 (external, sdk-cli)' }
        )

        instantiateProvider('agentrouter.org', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://agentrouter.org/v1',
            'key-123',
            { 'User-Agent': 'claude-cli/2.1.0 (external, sdk-cli)' }
        )
    })

    it('instantiates arcee provider via openai compat', () => {
        instantiateProvider('arcee', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.arcee.ai/api/v1',
            'key-123'
        )

        instantiateProvider('arceeai', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.arcee.ai/api/v1',
            'key-123'
        )

        instantiateProvider('arcee-ai', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'https://api.arcee.ai/api/v1',
            'key-123'
        )
    })

    it('instantiates ollama provider with default localhost endpoint', () => {
        const p = instantiateProvider('ollama', '')
        expect(p).toBe('mock-ollama')
        expect(providers.ollamaProvider).toHaveBeenCalledWith('http://localhost:11434/v1', 'ollama')
    })

    it('instantiates ollama provider with custom endpoint when passed as apiKey or OLLAMA_HOST', () => {
        instantiateProvider('ollama', 'http://192.168.1.50:11434')
        expect(providers.ollamaProvider).toHaveBeenCalledWith(
            'http://192.168.1.50:11434/v1',
            'ollama'
        )

        process.env.OLLAMA_HOST = 'http://remote-ollama:11434/v1'
        instantiateProvider('ollama', '')
        expect(providers.ollamaProvider).toHaveBeenCalledWith(
            'http://remote-ollama:11434/v1',
            'ollama'
        )
    })

    it('defaults to localhost proxy when provider is unknown', () => {
        const prevUrl = process.env.SERVER_URL
        delete process.env.SERVER_URL
        process.env.SERVER_PORT = '5000'
        try {
            instantiateProvider('unknown', 'key-123')
            expect(providers.openaiProvider).toHaveBeenCalledWith(
                'http://localhost:5000/api/v1/cli',
                'key-123'
            )
        } finally {
            if (prevUrl !== undefined) {
                process.env.SERVER_URL = prevUrl
            }
        }
    })
})
