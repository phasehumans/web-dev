import { describe, expect, it } from 'bun:test'

import {
    codexResponsesProvider,
    CodexProvider,
    resolveCodexModel,
    extractChatGPTAccountId,
    CODEX_DEFAULT_ENDPOINT,
} from '../../src/providers/codex'

import type { Message, ProviderTool } from '../../src/types'

describe('Codex Responses Provider Adapter (Unit)', () => {
    it('resolves supported models correctly and defaults invalid/legacy models to gpt-5.4', () => {
        expect(resolveCodexModel('gpt-5.4')).toBe('gpt-5.4')
        expect(resolveCodexModel('gpt-5.5')).toBe('gpt-5.5')
        expect(resolveCodexModel('gpt-5.6-sol')).toBe('gpt-5.6-sol')
        expect(resolveCodexModel('gpt-5.6-terra')).toBe('gpt-5.6-terra')
        expect(resolveCodexModel('gpt-5.6-luna')).toBe('gpt-5.6-luna')
        expect(resolveCodexModel('gpt-5.4-mini')).toBe('gpt-5.4-mini')
        expect(resolveCodexModel('gpt-4.1')).toBe('gpt-5.4')
        expect(resolveCodexModel('gpt-4o')).toBe('gpt-5.4')
        expect(resolveCodexModel('gpt-4o-mini')).toBe('gpt-5.4-mini')
        expect(resolveCodexModel('unknown-model')).toBe('gpt-5.4')
        expect(resolveCodexModel()).toBe('gpt-5.4')
    })

    it('extracts chatgpt_account_id from valid JWT token payload', () => {
        const payload = {
            'https://api.openai.com/auth': {
                chatgpt_account_id: 'test-account-123-uuid',
                chatgpt_plan_type: 'go',
            },
        }
        const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`
        expect(extractChatGPTAccountId(token)).toBe('test-account-123-uuid')
        expect(extractChatGPTAccountId('invalid-token')).toBeUndefined()
    })

    it('instantiates CodexProvider class wrapper correctly', () => {
        const provider = new CodexProvider('test-token')
        expect(provider.id).toBe('codex')
        expect(typeof provider.stream).toBe('function')
    })

    it('streams SSE chunks and yields thinking_delta, text, tool_call_delta, and usage', async () => {
        let capturedUrl = ''
        let capturedHeaders: any = null
        let capturedBody: any = null

        const sseData = [
            'data: {"type":"response.reasoning_text.delta","delta":"Analyzing task..."}\n\n',
            'data: {"type":"response.output_text.delta","delta":"Here is the solution."}\n\n',
            'data: {"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","call_id":"call_abc","name":"read_file","arguments":""}}\n\n',
            'data: {"type":"response.function_call_arguments.delta","output_index":1,"delta":"{\\"path\\":\\"src/index.ts\\"}"}\n\n',
            'data: {"type":"response.function_call_arguments.done","output_index":1}\n\n',
            'data: {"type":"response.completed","response":{"usage":{"input_tokens":50,"output_tokens":25}}}\n\n',
            'data: [DONE]\n\n',
        ].join('')

        const mockFetch: typeof fetch = async (url, options) => {
            capturedUrl = String(url)
            capturedHeaders = (options?.headers as any) || {}
            capturedBody = JSON.parse(String(options?.body || '{}'))

            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(sseData))
                    controller.close()
                },
            })

            return new Response(stream, {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            })
        }

        const payload = {
            'https://api.openai.com/auth': {
                chatgpt_account_id: 'acc-uuid-999',
            },
        }
        const token = `hdr.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

        const provider = codexResponsesProvider(token, {
            fetchFn: mockFetch,
        })

        const messages: Message[] = [{ role: 'user', content: 'hello' }]
        const tools: ProviderTool[] = [
            {
                name: 'read_file',
                description: 'Read file content',
                inputSchema: { type: 'object' },
            },
        ]

        const chunks: any[] = []
        for await (const chunk of provider.stream(messages, tools, 'Be helpful', {
            model: 'gpt-5.5',
        })) {
            chunks.push(chunk)
        }

        expect(capturedUrl).toBe(`${CODEX_DEFAULT_ENDPOINT}/codex/responses`)
        expect(capturedHeaders['chatgpt-account-id']).toBe('acc-uuid-999')
        expect(capturedHeaders['OpenAI-Beta']).toBe('responses=experimental')
        expect(capturedBody.model).toBe('gpt-5.5')
        expect(capturedBody.instructions).toBe('Be helpful')

        expect(chunks.length).toBe(5)
        expect(chunks[0]).toEqual({ type: 'thinking_delta', text: 'Analyzing task...' })
        expect(chunks[1]).toEqual({ type: 'text', text: 'Here is the solution.' })
        expect(chunks[2]).toEqual({
            type: 'tool_call_delta',
            id: 'call_abc',
            name: 'read_file',
            inputDelta: '{"path":"src/index.ts"}',
        })
        expect(chunks[3]).toEqual({
            type: 'tool_call',
            toolCall: {
                id: 'call_abc',
                name: 'read_file',
                input: '{"path":"src/index.ts"}',
            },
        })
        expect(chunks[4]).toEqual({
            type: 'usage',
            promptTokens: 50,
            completionTokens: 25,
        })
    })

    it('formats 429 usage limit reached error with plan and reset details', async () => {
        const errorJson = {
            error: {
                type: 'usage_limit_reached',
                message: 'The usage limit has been reached',
                plan_type: 'go',
                resets_in_seconds: 7200,
            },
        }

        const mockFetch: typeof fetch = async () => {
            return new Response(JSON.stringify(errorJson), {
                status: 429,
                statusText: 'Too Many Requests',
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const provider = codexResponsesProvider('tok', {
            fetchFn: mockFetch,
            accountId: 'dummy-acc',
        })

        let threw = false
        try {
            for await (const _ of provider.stream([{ role: 'user', content: 'hi' }])) {
                // Should throw before yielding
            }
        } catch (e: any) {
            threw = true
            expect(e.message).toContain('usage limit has been reached')
            expect(e.message).toContain('plan: go')
            expect(e.message).toContain('resets in approx 2h')
        }
        expect(threw).toBe(true)
    })
})
