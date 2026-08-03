import { describe, expect, it } from 'bun:test'

import { anthropicProvider } from '../../src/providers/anthropic'

describe('Anthropic Provider Prompt Caching', () => {
    it('attaches cache_control ephemeral directives to system prompt and message history', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            messages: {
                create: async (payload: any) => {
                    capturedPayload = payload
                    return (async function* () {
                        yield {
                            type: 'content_block_start',
                            index: 0,
                            content_block: { type: 'text', text: 'Hello' },
                        }
                        yield {
                            type: 'content_block_delta',
                            index: 0,
                            delta: { type: 'text_delta', text: ' world!' },
                        }
                    })()
                },
            },
        }

        const provider = anthropicProvider(undefined, undefined, mockClient)

        const messages = [
            { role: 'user', content: 'Turn 1 user' },
            { role: 'assistant', content: 'Turn 1 assistant' },
            { role: 'user', content: 'Turn 2 user' },
        ]

        const stream = provider.stream(
            messages,
            [{ name: 'read_file', description: 'Read a file', inputSchema: {} }],
            'System prompt content'
        )

        for await (const _chunk of stream) {
            // consume stream
        }

        expect(capturedPayload).not.toBeNull()

        // 1. Verify system prompt includes cache_control
        expect(Array.isArray(capturedPayload.system)).toBe(true)
        expect(capturedPayload.system[0].cache_control).toEqual({ type: 'ephemeral' })

        // 2. Verify last message includes cache_control
        const lastMsg = capturedPayload.messages[capturedPayload.messages.length - 1]
        expect(lastMsg).toBeDefined()
        const lastContentBlock = Array.isArray(lastMsg.content)
            ? lastMsg.content[lastMsg.content.length - 1]
            : lastMsg.content
        expect(lastContentBlock.cache_control).toEqual({ type: 'ephemeral' })
    })
})
