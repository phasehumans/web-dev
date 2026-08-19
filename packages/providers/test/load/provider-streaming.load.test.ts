import { describe, expect, it } from 'bun:test'

import { createProvider } from '../../src/models'

describe('Provider Streaming Load & Concurrency Tests', () => {
    it('handles 100 concurrent provider streams without deadlock or event drop', async () => {
        const streamCount = 100
        const chunksPerStream = 50

        const streamGen = async function* () {
            for (let i = 0; i < chunksPerStream; i++) {
                yield { type: 'text' as const, text: `chunk-${i}` }
            }
        }

        const provider = createProvider(
            { id: 'load-provider', name: 'Load Provider', models: ['m1'] },
            streamGen
        )

        const streamPromises = Array.from({ length: streamCount }, async (_, streamIdx) => {
            let totalChunks = 0
            for await (const chunk of provider.stream([], [], 'system')) {
                if (chunk.type === 'text') {
                    totalChunks++
                }
            }
            expect(totalChunks).toBe(chunksPerStream)
        })

        await Promise.all(streamPromises)
    })
})
