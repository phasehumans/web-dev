export type Role = 'system' | 'user' | 'assistant' | 'tool' | string

import type { Environment } from './environment'

export interface ToolExecuteContext {
    operations: Environment
    env: Map<string, string>
    onStream: (chunk: string) => void
    signal?: AbortSignal
}
export interface Message {
    role: Role
    content: string
    toolCalls?: ToolCall[]
    toolCallId?: string
}

export interface AgentMessage extends Message {
    id?: string
    parentId?: string
    isUI?: boolean
    errorMessage?: string
    timestamp?: number
}

export interface ToolCall {
    id: string
    name: string
    input: string // the raw json string or parsed object
}

export interface ToolResult {
    toolCallId: string
    result: string
    error?: string
}

export interface Tool<TInput = any> {
    name: string
    description: string
    inputSchema: any
    executionMode?: 'sequential' | 'parallel'
    prepareArguments?: (args: any) => any
    execute: (input: TInput, context: ToolExecuteContext) => Promise<string>
}

export interface AgentHooks {
    beforeToolCall?: (toolCall: ToolCall) => Promise<{ block?: boolean; reason?: string } | void>
    afterToolCall?: (
        toolCall: ToolCall,
        result: ToolResult
    ) => Promise<{ result?: string; error?: string } | void>
    shouldStopAfterTurn?: () => Promise<boolean>
    getSteeringMessages?: () => Promise<AgentMessage[]>
    prepareNextTurn?: () => Promise<{ modelOptions?: any; systemPrompt?: string } | void>
}

// event stream types (the async generator yields these)

export interface AgentStartEvent {
    type: 'AgentStart'
}

export interface TurnStartEvent {
    type: 'TurnStart'
}

export interface StreamChunkEvent {
    type: 'StreamChunk'
    content: string
}

export interface ThinkingChunkEvent {
    type: 'ThinkingChunk'
    content: string
}

export interface ToolCallStartEvent {
    type: 'ToolCallStart'
    toolCall: ToolCall
}

export interface ToolExecutionUpdateEvent {
    type: 'ToolExecutionUpdate'
    toolCallId: string
    chunk: string
}

export interface ToolCallResultEvent {
    type: 'ToolCallResult'
    result: ToolResult
}

export interface TurnEndEvent {
    type: 'TurnEnd'
}

export interface AgentStatusEvent {
    type: 'AgentStatus'
    message: string
}

export interface AgentUsageEvent {
    type: 'AgentUsage'
    promptTokens: number
    completionTokens: number
    model?: string
}

export interface AgentEndEvent {
    type: 'AgentEnd'
}

export interface AgentErrorEvent {
    type: 'AgentError'
    error: string
}

export interface ContextCompactedEvent {
    type: 'ContextCompacted'
    summary: string
}

export interface TerminalDataEvent {
    type: 'TerminalData'
    taskId: string
    chunk: string
}

export interface FileModifiedEvent {
    type: 'FileModified'
    path: string
    diff?: string
}

export interface AgentInterruptEvent {
    type: 'AgentInterrupt'
}

export type AgentEvent =
    | AgentStartEvent
    | TurnStartEvent
    | StreamChunkEvent
    | ThinkingChunkEvent
    | ToolCallStartEvent
    | ToolExecutionUpdateEvent
    | ToolCallResultEvent
    | TurnEndEvent
    | AgentEndEvent
    | AgentErrorEvent
    | AgentInterruptEvent
    | AgentStatusEvent
    | AgentUsageEvent
    | ContextCompactedEvent
    | TerminalDataEvent
    | FileModifiedEvent

export interface WireAgentEvent {
    type: string
    data: unknown
}

export function toWire(event: AgentEvent): WireAgentEvent {
    return {
        type: event.type,
        data: event,
    }
}

export function fromWire(wireEvent: WireAgentEvent): AgentEvent {
    return wireEvent.data as AgentEvent
}

export interface RequestLogToolEntry {
    name: string
    description?: string
    inputSchema?: any
    tokens: number
    isMcp: boolean
    serverName?: string
}

export interface RequestLogRuleEntry {
    path?: string
    content: string
    tokens: number
}

export interface RequestLogSystemPromptDecomposition {
    basePrompt: string
    basePromptTokens: number
    rules: RequestLogRuleEntry[]
    rulesText: string
    rulesTokens: number
    skills: string[]
    skillsText: string
    skillsTokens: number
    dynamicEnv: string
    dynamicEnvTokens: number
    totalTokens: number
}

export interface RequestLogEntry {
    turn: number
    timestamp: string
    sessionId: string
    model?: string
    request: {
        systemPrompt: string
        systemPromptDecomposition: RequestLogSystemPromptDecomposition
        tools: RequestLogToolEntry[]
        messages: any[]
        toolTokens: number
        messagesTokens: number
        totalEstimatedTokens: number
    }
    response: {
        assistantMessage: string
        thinking?: string
        toolCalls: ToolCall[]
        usage?: {
            promptTokens?: number
            completionTokens?: number
            totalTokens?: number
        }
        durationMs: number
        error?: string
    }
}

export interface ContextDecomposition {
    model: string
    maxTokens: number
    basePrompt: {
        text: string
        tokens: number
    }
    rules: {
        files: RequestLogRuleEntry[]
        text: string
        tokens: number
    }
    skills: {
        items: string[]
        text: string
        tokens: number
    }
    dynamicEnv: {
        text: string
        tokens: number
    }
    builtInTools: {
        tools: RequestLogToolEntry[]
        tokens: number
    }
    dynamicMcpTools: {
        tools: RequestLogToolEntry[]
        tokens: number
    }
    conversationHistory: {
        userTokens: number
        assistantTokens: number
        toolTokens: number
        totalTokens: number
    }
    totalTokens: number
    freeTokens: number
    cacheableStaticPrefixTokens: number
}

export interface DecomposeContextOptions {
    agent?: any
    systemPrompt?: string
    tools?: any[] | Map<string, any>
    messages?: any[]
    model?: string
    maxTokens?: number
}
