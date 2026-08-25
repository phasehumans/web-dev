export type Role = 'system' | 'user' | 'assistant' | 'tool'

export interface ToolCall {
    id: string
    name: string
    input: string
}

export interface Message {
    role: Role
    content: string
    toolCalls?: ToolCall[]
    toolCallId?: string
}

export interface ProviderTool {
    name: string
    description: string
    inputSchema: any
}

export type ProviderStreamChunk =
    | { type: 'text'; text: string }
    | { type: 'thinking_delta'; text: string }
    | { type: 'tool_call'; toolCall: ToolCall }
    | { type: 'tool_call_delta'; id: string; name?: string; inputDelta: string }
    | {
          type: 'usage'
          promptTokens: number
          completionTokens: number
          cacheCreationInputTokens?: number
          cacheReadInputTokens?: number
      }

export interface LLMProvider {
    /**
     * the unique identifier for this provider (e.g. 'anthropic', 'openai')
     */
    id: string

    /**
     * stream a response from the llm
     */
    stream(
        messages: Message[],
        tools?: ProviderTool[],
        systemPrompt?: string,
        modelOptions?: Record<string, any>,
        signal?: AbortSignal
    ): AsyncGenerator<ProviderStreamChunk, void, unknown>
}
