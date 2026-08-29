import { describe, expect, test } from 'bun:test'

import { AgentRouterProvider } from '../../src/providers/agentrouter'
import { CerebrasProvider } from '../../src/providers/cerebras'
import { CohereProvider } from '../../src/providers/cohere'
import { DeepSeekProvider } from '../../src/providers/deepseek'
import { FireworksProvider } from '../../src/providers/fireworks'
import { GroqProvider } from '../../src/providers/groq'
import { HuggingFaceProvider } from '../../src/providers/huggingface'
import { HyperbolicProvider } from '../../src/providers/hyperbolic'
import { KimiProvider } from '../../src/providers/kimi'
import { MistralProvider } from '../../src/providers/mistral'
import { MoonshotProvider } from '../../src/providers/moonshot'
import { NvidiaProvider } from '../../src/providers/nvidia'
import { PerplexityProvider } from '../../src/providers/perplexity'
import { SambaNovaProvider } from '../../src/providers/sambanova'
import { SiliconFlowProvider } from '../../src/providers/siliconflow'
import { TogetherProvider } from '../../src/providers/together'
import { XAIProvider } from '../../src/providers/xai'
import { ZAIProvider } from '../../src/providers/zai'

describe('OpenAI-compatible Subproviders (Unit)', () => {
    test('instantiates DeepSeekProvider with correct ID', () => {
        const provider = new DeepSeekProvider('dummy-key')
        expect(provider.id).toBe('deepseek')
    })

    test('instantiates GroqProvider with correct ID', () => {
        const provider = new GroqProvider('dummy-key')
        expect(provider.id).toBe('groq')
    })

    test('instantiates HuggingFaceProvider with correct ID', () => {
        const provider = new HuggingFaceProvider('dummy-key')
        expect(provider.id).toBe('huggingface')
    })

    test('instantiates KimiProvider with correct ID', () => {
        const provider = new KimiProvider('dummy-key')
        expect(provider.id).toBe('kimi')
    })

    test('instantiates MistralProvider with correct ID', () => {
        const provider = new MistralProvider('dummy-key')
        expect(provider.id).toBe('mistral')
    })

    test('instantiates MoonshotProvider with correct ID', () => {
        const provider = new MoonshotProvider('dummy-key')
        expect(provider.id).toBe('moonshot')
    })

    test('instantiates XAIProvider with correct ID', () => {
        const provider = new XAIProvider('dummy-key')
        expect(provider.id).toBe('xai')
    })

    test('instantiates ZAIProvider with correct ID', () => {
        const provider = new ZAIProvider('dummy-key')
        expect(provider.id).toBe('zai')
    })

    test('instantiates NvidiaProvider with correct ID', () => {
        const provider = new NvidiaProvider('dummy-key')
        expect(provider.id).toBe('nvidia')
    })

    test('instantiates SambaNovaProvider with correct ID', () => {
        const provider = new SambaNovaProvider('dummy-key')
        expect(provider.id).toBe('sambanova')
    })

    test('instantiates CerebrasProvider with correct ID', () => {
        const provider = new CerebrasProvider('dummy-key')
        expect(provider.id).toBe('cerebras')
    })

    test('instantiates SiliconFlowProvider with correct ID', () => {
        const provider = new SiliconFlowProvider('dummy-key')
        expect(provider.id).toBe('siliconflow')
    })

    test('instantiates TogetherProvider with correct ID', () => {
        const provider = new TogetherProvider('dummy-key')
        expect(provider.id).toBe('together')
    })

    test('instantiates HyperbolicProvider with correct ID', () => {
        const provider = new HyperbolicProvider('dummy-key')
        expect(provider.id).toBe('hyperbolic')
    })

    test('instantiates FireworksProvider with correct ID', () => {
        const provider = new FireworksProvider('dummy-key')
        expect(provider.id).toBe('fireworks')
    })

    test('instantiates PerplexityProvider with correct ID', () => {
        const provider = new PerplexityProvider('dummy-key')
        expect(provider.id).toBe('perplexity')
    })

    test('instantiates CohereProvider with correct ID', () => {
        const provider = new CohereProvider('dummy-key')
        expect(provider.id).toBe('cohere')
    })

    test('instantiates AgentRouterProvider with correct ID', () => {
        const provider = new AgentRouterProvider('dummy-key')
        expect(provider.id).toBe('agentrouter')
    })
})
