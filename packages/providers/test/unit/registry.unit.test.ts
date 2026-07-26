import { describe, expect, test } from 'bun:test'

import { registerProvider, getProvider, getAllProviders } from '../../src/registry'
import { LLMProvider } from '../../src/types'

describe('Provider Registry (Unit)', () => {
    test('should register and retrieve a provider successfully', () => {
        const dummyProvider: LLMProvider = {
            id: 'dummy',
            name: 'Dummy',
            models: [],
            stream: async function* () {
                yield { type: 'text', text: 'hi' }
            },
        }

        registerProvider(dummyProvider)

        const retrieved = getProvider('dummy')
        expect(retrieved).toBe(dummyProvider)
    })

    test('should throw error when getting an unregistered provider', () => {
        expect(() => {
            getProvider('non-existent-provider')
        }).toThrow("Provider 'non-existent-provider' not found.")
    })

    test('should return all registered providers', () => {
        const providers = getAllProviders()
        expect(Array.isArray(providers)).toBe(true)
        const ids = providers.map((p) => p.id)
        expect(ids).toContain('dummy')
    })
})
