import type { LLMProvider, ProviderStreamChunk, ProviderTool } from '@december/providers'
import type { Message } from '@december/shared'

export class MockLLM implements LLMProvider {
    public id = 'mock'
    public mockResponses: string[] = []

    async *stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: any,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown> {
        const response = this.mockResponses.shift() || 'default response'
        yield { type: 'text', text: response }
    }
}
