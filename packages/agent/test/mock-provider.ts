import type { LLMProvider, ProviderStreamChunk, ProviderTool, Message } from '@december/providers'

export type MockResponseFn = (
    messages: Message[],
    tools?: ProviderTool[],
    systemPrompt?: string,
    modelOptions?: Record<string, any>
) => string | ProviderStreamChunk[] | AsyncIterable<ProviderStreamChunk> | Error

export type MockResponseItem = string | ProviderStreamChunk[] | Error | MockResponseFn

export interface MockLLMCall {
    messages: Message[]
    tools?: ProviderTool[]
    systemPrompt?: string
    modelOptions?: Record<string, any>
    signal?: AbortSignal
}

export class MockLLM implements LLMProvider {
    public id = 'mock'
    public calls: MockLLMCall[] = []
    public mockResponses: MockResponseItem[] = []
    public defaultResponse: ProviderStreamChunk[] = [{ type: 'text', text: 'default response' }]

    constructor(id = 'mock') {
        this.id = id
    }

    public pushResponse(response: MockResponseItem) {
        this.mockResponses.push(response)
    }

    public reset() {
        this.calls = []
        this.mockResponses = []
    }

    async *stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
        this.calls.push({ messages, tools, systemPrompt, modelOptions, signal })

        if (signal?.aborted) {
            const err: any = new Error('Aborted')
            err.name = 'AbortError'
            throw err
        }

        const rawItem: MockResponseItem = this.mockResponses.shift() || this.defaultResponse

        const resolvedItem =
            typeof rawItem === 'function'
                ? rawItem(messages, tools, systemPrompt, modelOptions)
                : rawItem

        if (resolvedItem instanceof Error) {
            throw resolvedItem
        }

        if (typeof resolvedItem === 'string') {
            yield { type: 'text', text: resolvedItem }
            return
        }

        if (Array.isArray(resolvedItem)) {
            for (const chunk of resolvedItem) {
                if (signal?.aborted) {
                    const err: any = new Error('Aborted')
                    err.name = 'AbortError'
                    throw err
                }
                yield chunk
            }
            return
        }

        for await (const chunk of resolvedItem) {
            if (signal?.aborted) {
                const err: any = new Error('Aborted')
                err.name = 'AbortError'
                throw err
            }
            yield chunk
        }
    }
}
