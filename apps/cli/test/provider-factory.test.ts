import * as providers from '@december/providers'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { instantiateProvider } from '../src/utils/provider-factory'

vi.mock('@december/providers', () => ({
    openaiProvider: vi.fn(),
    anthropicProvider: vi.fn(),
    geminiProvider: vi.fn(),
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

    it('instantiates gemini provider', () => {
        const p = instantiateProvider('google', 'key-123')
        expect(p).toBe('mock-gemini')
        expect(providers.geminiProvider).toHaveBeenCalledWith('key-123')
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
