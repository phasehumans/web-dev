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
