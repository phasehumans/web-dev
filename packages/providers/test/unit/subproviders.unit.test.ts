import { describe, expect, test } from 'bun:test'

import { DeepSeekProvider } from '../../src/providers/deepseek'
import { GroqProvider } from '../../src/providers/groq'
import { HuggingFaceProvider } from '../../src/providers/huggingface'
import { KimiProvider } from '../../src/providers/kimi'
import { MistralProvider } from '../../src/providers/mistral'
import { MoonshotProvider } from '../../src/providers/moonshot'
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
})
