import * as providers from '@december/providers'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { instantiateProvider } from '../src/utils/provider-factory'

vi.mock('@december/providers', () => ({
    openaiProvider: vi.fn(),
    anthropicProvider: vi.fn(),
    geminiProvider: vi.fn(),
    openrouterProvider: vi.fn(),
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

    it('defaults to localhost proxy when provider is unknown', () => {
        process.env.SERVER_PORT = '5000'
        instantiateProvider('unknown', 'key-123')
        expect(providers.openaiProvider).toHaveBeenCalledWith(
            'http://localhost:5000/api/v1',
            'key-123'
        )
    })
})
