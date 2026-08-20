import { describe, expect, it } from 'bun:test'

import { getModelContextWindow } from '../../src/models'

describe('Provider Model Resolution & Throughput Benchmarks', () => {
    it('benchmarks model context window lookup across 50,000 queries', () => {
        const testModels = [
            'gemini-3.7-flash',
            'claude-3-7-sonnet-latest',
            'gpt-4o',
            'o3-mini',
            'deepseek-chat',
            'ollama/llama-3.3-70b',
            'custom-model-64k',
            'unknown-model',
        ]

        const start = performance.now()
        for (let i = 0; i < 50000; i++) {
            getModelContextWindow(testModels[i % testModels.length]!)
        }
        const duration = performance.now() - start

        expect(duration).toBeLessThan(100) // 50,000 lookups in under 100ms
    })
})
