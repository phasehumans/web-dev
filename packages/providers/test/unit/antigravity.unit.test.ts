import { describe, expect, it } from 'bun:test'

import {
    antigravityProvider,
    AntigravityProvider,
    resolveAntigravityModel,
    ANTIGRAVITY_DEFAULT_ENDPOINT,
} from '../../src/providers/antigravity'

import type { Message, ProviderTool } from '../../src/types'

describe('Antigravity Provider Adapter (Unit)', () => {
    it('resolves model aliases and strips antigravity/ and google/ prefixes correctly', () => {
        expect(resolveAntigravityModel('gemini-3.7-flash')).toBe('gemini-3.7-flash-tiered')
        expect(resolveAntigravityModel('antigravity/gemini-3.7-flash')).toBe(
            'gemini-3.7-flash-tiered'
        )
        expect(resolveAntigravityModel('google/gemini-3.7-flash')).toBe('gemini-3.7-flash-tiered')
        expect(resolveAntigravityModel('antigravity/gemini-3.6-flash')).toBe(
            'gemini-3.6-flash-high'
        )
        expect(resolveAntigravityModel('gemini-3.1-pro')).toBe('gemini-pro-agent')
        expect(resolveAntigravityModel('antigravity/gemini-3.1-pro')).toBe('gemini-pro-agent')
        expect(resolveAntigravityModel()).toBe('gemini-3.8-flash-tiered')
    })

    it('instantiates AntigravityProvider class wrapper correctly', () => {
        const provider = new AntigravityProvider('test-oauth-token')
        expect(provider.id).toBe('antigravity')
        expect(typeof provider.stream).toBe('function')
    })

    it('streams SSE chunks and yields thinking_delta, text, tool_call_delta, and usage', async () => {
        let capturedUrl = ''
        let capturedOptions: any = null

        const sseData = [
            'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"Thinking about user request..."}]}}]}\n\n',
            'data: {"candidates":[{"content":{"parts":[{"text":"Here is the file list:"}]}}]}\n\n',
            'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"list_dir","args":{"DirectoryPath":"/home/code"}}}]}}],"usageMetadata":{"promptTokenCount":42,"candidatesTokenCount":18}}\n\n',
        ].join('')

        const mockFetch: typeof fetch = async (url, options) => {
            capturedUrl = String(url)
            capturedOptions = options

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

        const provider = antigravityProvider('ya29.test-bearer-token', {
            fetchFn: mockFetch,
            projectId: 'test-antigravity-project',
        })

        const messages: Message[] = [{ role: 'user', content: 'List directory' }]
        const tools: ProviderTool[] = [
            {
                name: 'list_dir',
                description: 'List directory contents',
                inputSchema: {
                    type: 'object',
                    properties: {
                        DirectoryPath: { type: 'string' },
                    },
                    required: ['DirectoryPath'],
                },
            },
        ]

        const stream = provider.stream(messages, tools, 'You are an AI assistant', {
            model: 'antigravity/gemini-3.7-flash',
            temperature: 0.3,
        })

        const chunks: any[] = []
        for await (const chunk of stream) {
            chunks.push(chunk)
        }

        expect(capturedUrl).toBe(
            `${ANTIGRAVITY_DEFAULT_ENDPOINT}/v1internal:streamGenerateContent?alt=sse`
        )
        expect(capturedOptions.method).toBe('POST')
        expect(capturedOptions.headers['Authorization']).toBe('Bearer ya29.test-bearer-token')
        expect(capturedOptions.headers['Accept']).toBe('text/event-stream')
        expect(capturedOptions.headers['User-Agent']).toContain('google-antigravity-cli')
        expect(capturedOptions.headers['x-goog-user-project']).toBe('test-antigravity-project')

        const requestBody = JSON.parse(capturedOptions.body)
        expect(requestBody.project).toBe('test-antigravity-project')
        expect(requestBody.model).toBe('gemini-3.7-flash-tiered')
        expect(requestBody.request.systemInstruction).toEqual({
            parts: [{ text: 'You are an AI assistant' }],
        })
        expect(requestBody.request.tools[0].functionDeclarations[0].name).toBe('list_dir')
        expect(requestBody.request.generationConfig.temperature).toBe(0.3)

        expect(chunks).toEqual([
            { type: 'thinking_delta', text: 'Thinking about user request...' },
            { type: 'text', text: 'Here is the file list:' },
            {
                type: 'tool_call_delta',
                id: expect.any(String),
                name: 'list_dir',
                inputDelta: JSON.stringify({ DirectoryPath: '/home/code' }),
            },
            { type: 'usage', promptTokens: 42, completionTokens: 18 },
        ])
    })

    it('maps thinkingLevel correctly in generationConfig', async () => {
        let capturedBody: any = null

        const mockFetch: typeof fetch = async (_url, options) => {
            capturedBody = JSON.parse(String(options?.body))
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(
                        encoder.encode(
                            'data: {"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}\n\n'
                        )
                    )
                    controller.close()
                },
            })
            return new Response(stream, { status: 200 })
        }

        const provider = antigravityProvider('token', { fetchFn: mockFetch })

        // 1. Medium thinking level
        for await (const _ of provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'medium',
        })) {
            // consume
        }
        expect(capturedBody.request.generationConfig.thinkingConfig).toEqual({
            thinkingBudget: 4096,
            includeThoughts: true,
        })

        // 2. Off thinking level
        for await (const _ of provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'off',
        })) {
            // consume
        }
        expect(capturedBody.request.generationConfig.thinkingConfig).toEqual({
            thinkingBudget: 0,
        })

        // 3. Auto / default thinking level
        for await (const _ of provider.stream([{ role: 'user', content: 'test' }], [], undefined, {
            thinkingLevel: 'auto',
        })) {
            // consume
        }
        expect(capturedBody.request.generationConfig.thinkingConfig).toEqual({
            includeThoughts: true,
        })
    })

    it('throws descriptive error on non-200 HTTP response', async () => {
        const mockFetch: typeof fetch = async () => {
            return new Response(
                JSON.stringify({
                    error: {
                        code: 403,
                        message: 'Antigravity quota exceeded or unauthorized',
                    },
                }),
                { status: 403, statusText: 'Forbidden' }
            )
        }

        const provider = antigravityProvider('bad-token', { fetchFn: mockFetch })

        let thrownError: any = null
        try {
            const stream = provider.stream([{ role: 'user', content: 'hi' }])
            for await (const _ of stream) {
                // consume
            }
        } catch (err) {
            thrownError = err
        }

        expect(thrownError).not.toBeNull()
        expect(thrownError.message).toContain('Antigravity API error (403)')
        expect(thrownError.message).toContain('Antigravity quota exceeded or unauthorized')
    })
})
