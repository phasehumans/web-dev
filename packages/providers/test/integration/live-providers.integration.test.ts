import { describe, expect, test } from 'bun:test'

import { openaiProvider } from '../../src/providers/openai'

describe('Live LLM Providers Integration (Opt-In)', () => {
    test.skipIf(!process.env.RUN_LIVE_TESTS || !process.env.OPENAI_API_KEY)(
        'connects to live OpenAI endpoint when enabled',
        async () => {
            const provider = openaiProvider(undefined, process.env.OPENAI_API_KEY)
            const stream = provider.stream([{ role: 'user', content: 'Reply with hello' }])
            const chunks = []
            for await (const chunk of stream) {
                chunks.push(chunk)
            }
            expect(chunks.length).toBeGreaterThan(0)
        }
    )
})
