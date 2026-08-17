import type { LLMProvider } from './types.ts'

const providers = new Map<string, LLMProvider>()

export function registerProvider(provider: LLMProvider) {
    providers.set(provider.id, provider)
}

export function getProvider(id: string): LLMProvider {
    const provider = providers.get(id)
    if (!provider) {
        throw new Error(`Provider '${id}' not found. Did you forget to register it?`)
    }
    return provider
}

export function getAllProviders(): LLMProvider[] {
    return Array.from(providers.values())
}
