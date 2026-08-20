import { describe, expect, it } from 'bun:test'

import { createProvider } from '../../src/models'

import type { ProviderStreamChunk } from '../../src/types'

describe('Provider Streaming Contract Conformance (Integration)', () => {
    it('satisfies ProviderStreamChunk types (text, thinking_delta, tool_call_delta, tool_call, usage)', async () => {
        const streamGenerator = async function* () {
            yield { type: 'thinking_delta' as const, text: 'reasoning step' }
            yield { type: 'text' as const, text: 'Hello' }
            yield {
                type: 'tool_call_delta' as const,
                id: 'call_1',
                name: 'bash',
                inputDelta: '{"command": "ls"}',
            }
            yield {
                type: 'tool_call' as const,
                toolCall: { id: 'call_1', name: 'bash', input: '{"command": "ls"}' },
            }
            yield { type: 'usage' as const, promptTokens: 15, completionTokens: 8 }
        }

        const provider = createProvider(
            {
                id: 'contract-provider',
                name: 'Contract Provider',
                models: ['m1'],
            },
            streamGenerator
        )

        const chunks: ProviderStreamChunk[] = []
        for await (const chunk of provider.stream([], [], 'system')) {
            chunks.push(chunk)
        }

        expect(chunks.length).toBe(5)
        expect(chunks[0].type).toBe('thinking_delta')
        expect(chunks[1].type).toBe('text')
        expect(chunks[2].type).toBe('tool_call_delta')
        expect(chunks[3].type).toBe('tool_call')
        expect(chunks[4].type).toBe('usage')
    })
})
