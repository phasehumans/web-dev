import { describe, expect, it } from 'bun:test'

import { getModelContextWindow } from '../../src/models'
import { ollamaProvider, OllamaProvider, resolveOllamaModel } from '../../src/providers/ollama'

describe('Ollama Provider Adapter (Unit)', () => {
    it('instantiates OllamaProvider class wrapper correctly with default endpoint', () => {
        const provider = new OllamaProvider()
        expect(provider.id).toBe('ollama')
        expect(typeof provider.stream).toBe('function')
    })

    it('resolves model aliases by stripping ollama/ prefix', () => {
        expect(resolveOllamaModel('ollama/qwen2.5-coder:7b')).toBe('qwen2.5-coder:7b')
        expect(resolveOllamaModel('qwen2.5-coder:7b')).toBe('qwen2.5-coder:7b')
        expect(resolveOllamaModel(undefined)).toBe('qwen2.5-coder:7b')
    })

    it('injects num_ctx options and forwards messages, system prompt, and tools accurately', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            chat: {
                completions: {
                    create: async (payload: any) => {
                        capturedPayload = payload
                        return (async function* () {
                            yield {
                                usage: { prompt_tokens: 15, completion_tokens: 8 },
                            }
                            yield {
                                choices: [
                                    {
                                        delta: {
                                            content: 'Local response',
                                            reasoning_content: 'Local thinking...',
                                        },
                                    },
                                ],
                            }
                        })()
                    },
                },
            },
        }

        const provider = ollamaProvider('http://localhost:11434/v1', 'ollama', 32768, mockClient)

        const messages = [{ role: 'user' as const, content: 'Hello local model' }]

        const stream = provider.stream(messages, undefined, 'System instruction', {
            model: 'ollama/qwen2.5-coder:7b',
        })

        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedPayload).not.toBeNull()
        expect(capturedPayload.model).toBe('qwen2.5-coder:7b')
        expect(capturedPayload.options).toEqual({ num_ctx: 32768 })
        expect(capturedPayload.messages[0]).toEqual({
            role: 'system',
            content: 'System instruction',
        })
        expect(capturedPayload.messages[1]).toEqual({
            role: 'user',
            content: 'Hello local model',
        })

        expect(chunks).toEqual([
            { type: 'usage', promptTokens: 15, completionTokens: 8 },
            { type: 'thinking_delta', text: 'Local thinking...' },
            { type: 'text', text: 'Local response' },
        ])
    })

    it('allows overriding numCtx via modelOptions or provider initialization', async () => {
        let capturedPayload: any = null

        const mockClient: any = {
            chat: {
                completions: {
                    create: async (payload: any) => {
                        capturedPayload = payload
                        return (async function* () {})()
                    },
                },
            },
        }

        const provider = ollamaProvider('http://localhost:11434/v1', 'ollama', 16384, mockClient)

        const stream = provider.stream([{ role: 'user', content: 'test' }], undefined, undefined, {
            numCtx: 65536,
        })

        for await (const _ of stream) {
            // Intentionally empty: consuming stream to capture payload
        }

        expect(capturedPayload.options.num_ctx).toBe(65536)
    })

    it('returns appropriate context window for Ollama models in getModelContextWindow', () => {
        expect(getModelContextWindow('qwen2.5-coder:7b')).toBe(32768)
        expect(getModelContextWindow('qwen2.5-coder:32b')).toBe(32768)
        expect(getModelContextWindow('llama3.3:70b')).toBe(128000)
        expect(getModelContextWindow('llama3.1:8b')).toBe(128000)
        expect(getModelContextWindow('mistral-nemo:latest')).toBe(128000)
        expect(getModelContextWindow('ollama/qwen2.5-coder:7b')).toBe(32768)
    })
})
