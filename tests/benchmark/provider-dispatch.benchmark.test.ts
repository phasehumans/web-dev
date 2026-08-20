import { getModelContextWindow, MODEL_CONTEXT_WINDOWS } from '@december/providers'
import { describe, expect, it } from 'bun:test'

import {
    isValidModelForProvider,
    getDefaultModelForProvider,
} from '../../apps/cli/src/utils/models'

describe('Provider Model Mapping & Context Dispatch Benchmarks', () => {
    it('benchmarks context window lookups across 100,000 iterations', () => {
        const testModels = [
            'gemini-3.7-flash',
            'claude-3-7-sonnet-latest',
            'gpt-4o',
            'o3-mini',
            'deepseek-chat',
            'ollama/llama-3.3-70b',
            'openrouter/anthropic/claude-3.5-sonnet',
            'custom-model-200k',
        ]

        const start = performance.now()
        for (let i = 0; i < 100000; i++) {
            const m = testModels[i % testModels.length]
            const ctx = getModelContextWindow(m)
            if (i === 0) {
                expect(ctx).toBe(1_000_000)
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(150) // 100,000 lookups in under 150ms
    })

    it('benchmarks static MODEL_CONTEXT_WINDOWS table lookups over 100,000 calls', () => {
        const start = performance.now()
        let sum = 0
        for (let i = 0; i < 100000; i++) {
            sum += MODEL_CONTEXT_WINDOWS['gemini-3.7-flash'] || 0
        }
        const duration = performance.now() - start

        expect(sum).toBeGreaterThan(0)
        expect(duration).toBeLessThan(50) // 100,000 table accesses in under 50ms
    })

    it('benchmarks provider model validation and default model resolution over 50,000 calls', () => {
        const providers = ['openai', 'anthropic', 'gemini', 'openrouter', 'ollama']

        const start = performance.now()
        for (let i = 0; i < 50000; i++) {
            const p = providers[i % providers.length]
            const defaultModel = getDefaultModelForProvider(p)
            const isValid = isValidModelForProvider(p, defaultModel)
            if (i === 0) {
                expect(isValid).toBe(true)
            }
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(200) // 50,000 validations in under 200ms
    })
})
