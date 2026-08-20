import { describe, expect, it } from 'bun:test'

import { getModelContextWindow } from '../../src/models'

describe('Provider Token & Model Context Parsers (Unit)', () => {
    it('resolves exact context sizes across all top-tier providers', () => {
        expect(getModelContextWindow('gemini-3.7-flash')).toBe(1_000_000)
        expect(getModelContextWindow('claude-3-7-sonnet-latest')).toBe(200_000)
        expect(getModelContextWindow('gpt-4o')).toBe(128_000)
        expect(getModelContextWindow('o3-mini')).toBe(200_000)
        expect(getModelContextWindow('deepseek-chat')).toBe(128_000)
    })

    it('infers token context from model substring heuristics', () => {
        expect(getModelContextWindow('ollama/llama-3.3-70b')).toBe(128_000)
        expect(getModelContextWindow('openrouter/anthropic/claude-3.5-sonnet')).toBe(200_000)
        expect(getModelContextWindow('google/gemini-2.5-pro')).toBe(1_000_000)
        expect(getModelContextWindow('my-custom-model-128k')).toBe(131_072)
    })
})
