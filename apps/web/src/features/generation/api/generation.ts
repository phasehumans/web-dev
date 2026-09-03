import { io } from 'socket.io-client'

import type {
    BackendProject,
    BackendMessage,
    BackendProjectVersionSummary,
} from '@/features/sessions/api/session'

import { useAppStore } from '@/app/store'
import { sessionAPI } from '@/features/sessions/api/session'
import { ApiError, refreshAuthSession } from '@/shared/api/client'
import { getWebSocketUrl } from '@/shared/config/env'

export type GenerationMessageStatus = 'thinking' | 'building' | 'done' | 'error'

export interface PlannedBuildFile {
    path: string
    purpose: string
    generate: boolean
    generator: string
}

export interface PreviewSelectedElementPayload {
    tagName: string
    textContent: string
}

export interface AppliedProjectChangeResult {
    project: BackendProject
    version: Pick<BackendProjectVersionSummary, 'id' | 'versionNumber' | 'label' | 'status'>
    versions: BackendProjectVersionSummary[]
    chatMessages: BackendMessage[]
    generatedFiles: Record<string, string>
    appliedFiles: string[]
    deletedFiles: string[]
    assistantMessage: string
}

export type GenerationStreamEvent =
    | {
          type: 'connected'
          data: {
              ok: boolean
          }
      }
    | {
          type: 'project-created'
          data: {
              project: BackendProject
              version: Pick<BackendProjectVersionSummary, 'id' | 'versionNumber' | 'label'>
          }
      }
    | {
          type: 'AgentStart'
          data?: any
      }
    | {
          type: 'TurnStart'
          data?: any
      }
    | {
          type: 'AgentStatus'
          data: {
              message: string
          }
      }
    | {
          type: 'ThinkingChunk'
          data: {
              content: string
          }
      }
    | {
          type: 'StreamChunk'
          data: {
              content: string
          }
      }
    | {
          type: 'ToolCallStart'
          data: {
              toolCall: any
          }
      }
    | {
          type: 'ToolExecutionUpdate'
          data: {
              toolCallId: string
              chunk: string
          }
      }
    | {
          type: 'ToolCallResult'
          data: {
              result: any
              toolCallId?: string
              output?: string
              error?: string
          }
      }
    | {
          type: 'FileModified'
          data: {
              path: string
              diff?: string
              action?: 'created' | 'modified' | 'deleted'
          }
      }
    | {
          type: 'ContextCompacted'
          data: {
              summary: string
          }
      }
    | {
          type: 'AgentInterrupt'
          data?: any
      }
    | {
          type: 'TurnEnd'
          data?: any
      }
    | {
          type: 'AgentEnd'
          data?: any
      }
    | {
          type: 'AgentError'
          data: {
              error?: string
              message?: string
          }
      }
    | {
          type: 'phase'
          data: {
              phase: 'thinking' | 'building'
          }
      }
    | {
          type: 'message-start'
          data: {
              messageId: string
              status: 'thinking'
          }
      }
    | {
          type: 'message-chunk'
          data: {
              messageId: string
              chunk: string
          }
      }
    | {
          type: 'message-complete'
          data: {
              messageId: string
              status: 'done'
          }
      }
    | {
          type: 'build-plan'
          data: {
              files: PlannedBuildFile[]
              totalFiles: number
          }
      }
    | {
          type: 'patch-plan'
          data: {
              files: Array<{
                  path: string
                  action: 'create' | 'update' | 'delete'
                  purpose: string
                  instructions: string
              }>
              totalFiles: number
          }
      }
    | {
          type: 'file-start'
          data: {
              path: string
              purpose: string
              generator: string
              index: number
              total: number
          }
      }
    | {
          type: 'file-chunk'
          data: {
              path: string
              chunk: string
          }
      }
    | {
          type: 'file-complete'
          data: {
              path: string
              index: number
              total: number
          }
      }
    | {
          type: 'file-error'
          data: {
              path: string
              message: string
          }
      }
    | {
          type: 'result'
          data: {
              project: BackendProject
              version: Pick<
                  BackendProjectVersionSummary,
                  'id' | 'versionNumber' | 'label' | 'status'
              >
              intent: unknown
              plan: unknown
              generatedFiles: Record<string, string>
              versions?: BackendProjectVersionSummary[]
              chatMessages?: BackendMessage[]
              appliedFiles?: string[]
              deletedFiles?: string[]
              assistantMessage?: string
          }
      }
    | {
          type: 'error'
          data: {
              message: string
          }
      }

export function normalizeAgentStreamEvent(raw: any): GenerationStreamEvent {
    let payload = raw
    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload)
        } catch {
            // Intentionally swallowed: Keep as raw string if JSON parsing fails
        }
    }

    if (!payload || typeof payload !== 'object') {
        return { type: 'StreamChunk', data: { content: String(raw ?? '') } }
    }

    let innerData = payload.data !== undefined ? payload.data : payload
    if (typeof innerData === 'string') {
        try {
            innerData = JSON.parse(innerData)
        } catch {
            // Intentionally swallowed: Keep as raw string if JSON parsing fails
        }
    }

    const eventType =
        payload.type || (typeof innerData === 'object' && innerData?.type) || 'StreamChunk'

    switch (eventType) {
        case 'ThinkingChunk': {
            const content =
                (typeof innerData === 'object'
                    ? (innerData?.content ?? innerData?.thoughts)
                    : null) ??
                payload.content ??
                payload.thoughts ??
                (typeof innerData === 'string' ? innerData : '')
            return {
                type: 'ThinkingChunk',
                data: {
                    content: typeof content === 'string' ? content : JSON.stringify(content ?? ''),
                },
            }
        }
        case 'StreamChunk': {
            const content =
                (typeof innerData === 'object' ? (innerData?.content ?? innerData?.chunk) : null) ??
                payload.content ??
                payload.chunk ??
                (typeof innerData === 'string' ? innerData : '')
            return {
                type: 'StreamChunk',
                data: {
                    content: typeof content === 'string' ? content : JSON.stringify(content ?? ''),
                },
            }
        }
        case 'ToolCallStart': {
            const tc =
                (typeof innerData === 'object' && innerData?.toolCall) ||
                payload.toolCall ||
                (typeof innerData === 'object' ? innerData : payload)
            const id = tc?.id || tc?.toolCallId || `tool-${Date.now()}`
            const name = tc?.name || tc?.toolName || 'tool'
            const input = tc?.input ?? tc?.toolInput ?? tc?.args ?? {}
            return {
                type: 'ToolCallStart',
                data: {
                    toolCall: { id, name, input, args: input },
                },
            }
        }
        case 'ToolExecutionUpdate':
        case 'TerminalData': {
            const toolCallId =
                (typeof innerData === 'object' && (innerData?.toolCallId || innerData?.taskId)) ||
                payload.toolCallId ||
                payload.taskId ||
                ''
            const chunk =
                (typeof innerData === 'object' && innerData?.chunk) ||
                payload.chunk ||
                (typeof innerData === 'string' ? innerData : '')
            return {
                type: 'ToolExecutionUpdate',
                data: { toolCallId: String(toolCallId), chunk: String(chunk) },
            }
        }
        case 'ToolCallResult': {
            const res =
                typeof innerData === 'object' && innerData?.result !== undefined
                    ? innerData.result
                    : payload.result !== undefined
                      ? payload.result
                      : innerData
            const toolCallId =
                (typeof innerData === 'object' && innerData?.toolCallId) ||
                payload.toolCallId ||
                (typeof res === 'object' && res?.toolCallId) ||
                undefined
            const output =
                (typeof res === 'object' ? (res?.output ?? res?.content) : null) ??
                (typeof innerData === 'object'
                    ? (innerData?.output ?? innerData?.content)
                    : null) ??
                (typeof res === 'string' ? res : undefined)
            const error =
                (typeof res === 'object' ? res?.error : null) ??
                (typeof innerData === 'object' ? innerData?.error : null) ??
                payload.error ??
                undefined
            return {
                type: 'ToolCallResult',
                data: {
                    result: res,
                    toolCallId,
                    output,
                    error: error ? String(error) : undefined,
                },
            }
        }
        case 'FileModified': {
            const path =
                (typeof innerData === 'object' && (innerData?.path || innerData?.filePath)) ||
                payload.path ||
                payload.filePath ||
                ''
            const diff =
                (typeof innerData === 'object' && innerData?.diff) || payload.diff || undefined
            const action =
                (typeof innerData === 'object' && innerData?.action) || payload.action || 'modified'
            return {
                type: 'FileModified',
                data: {
                    path: String(path),
                    diff,
                    action,
                },
            }
        }
        case 'ContextCompacted': {
            const summary =
                (typeof innerData === 'object' && innerData?.summary) || payload.summary || ''
            return {
                type: 'ContextCompacted',
                data: { summary: String(summary) },
            }
        }
        case 'AgentStatus': {
            const message =
                (typeof innerData === 'object' &&
                    (innerData?.message || innerData?.statusMessage)) ||
                payload.message ||
                payload.statusMessage ||
                ''
            return {
                type: 'AgentStatus',
                data: { message: String(message) },
            }
        }
        case 'AgentError': {
            const error =
                (typeof innerData === 'object' && (innerData?.error || innerData?.message)) ||
                payload.error ||
                payload.message ||
                'Agent Execution Error'
            return {
                type: 'AgentError',
                data: { error: String(error), message: String(error) },
            }
        }
        case 'AgentInterrupt': {
            return { type: 'AgentInterrupt', data: {} }
        }
        case 'TurnEnd': {
            return { type: 'TurnEnd', data: {} }
        }
        case 'AgentEnd': {
            return { type: 'AgentEnd', data: innerData }
        }
        case 'AgentStart':
        case 'TurnStart':
        case 'connected':
        case 'project-created':
        case 'phase':
        case 'message-start':
        case 'message-chunk':
        case 'message-complete':
        case 'build-plan':
        case 'patch-plan':
        case 'file-start':
        case 'file-chunk':
        case 'file-complete':
        case 'file-error':
        case 'result':
        case 'error': {
            return { type: eventType, data: innerData } as GenerationStreamEvent
        }
        default: {
            return { type: eventType, data: innerData } as any
        }
    }
}

type GenerateProjectInput = {
    prompt: string
    sessionId?: string | null
    projectId?: string | null
    model?: string
    signal?: AbortSignal
    onEvent: (event: GenerationStreamEvent) => void
}
type ApplyProjectEditInput = {
    sessionId?: string
    projectId?: string
    versionId?: string | null
    prompt: string
    selectedElement?: PreviewSelectedElementPayload | null
    model?: string
    signal?: AbortSignal
    onEvent: (event: GenerationStreamEvent) => void
}
type ApplyProjectFixInput = {
    sessionId?: string
    projectId?: string
    versionId?: string | null
    errorMessage: string
    stack?: string
    model?: string
    signal?: AbortSignal
    onEvent: (event: GenerationStreamEvent) => void
}

let sharedSocket: ReturnType<typeof io> | null = null

export const getSharedSocket = (): ReturnType<typeof io> => {
    if (!sharedSocket || sharedSocket.disconnected) {
        const baseUrl = getWebSocketUrl()
        sharedSocket = io(baseUrl, {
            path: '/socket.io/',
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'],
        })
    }
    return sharedSocket
}

const runOverSocket = async (
    sessionId: string,
    prompt: string,
    onEvent: (event: GenerationStreamEvent) => void,
    signal?: AbortSignal
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const socket = getSharedSocket()

        let hasResolved = false
        let hasSentPrompt = false
        let resultData: any = null

        const cleanup = () => {
            socket.off('connect', handleConnect)
            socket.off('connect_error', handleConnectError)
            socket.off('agent_event', handleAgentEvent)
            socket.off('error', handleError)
            socket.off('disconnect', handleDisconnect)
            socket.io.off('reconnect', handleReconnect)
            socket.io.off('reconnect_failed', handleReconnectFailed)
        }

        const handleConnect = () => {
            onEvent({ type: 'connected', data: { ok: true } })

            socket.emit('join_session', sessionId)

            if (!hasSentPrompt) {
                hasSentPrompt = true
                socket.emit('send_prompt', {
                    sessionId: sessionId,
                    projectId: sessionId,
                    prompt: prompt,
                })
            }
        }

        const handleReconnect = () => {
            socket.emit('join_session', sessionId)
        }

        const handleReconnectFailed = () => {
            if (!hasResolved) {
                hasResolved = true
                cleanup()
                reject(new ApiError('Socket reconnection failed after multiple attempts', 500))
            }
        }

        const handleConnectError = async (err: any) => {
            const errMsg = err?.message || ''
            if (errMsg.includes('Authentication error') || errMsg.includes('401')) {
                const refreshed = await refreshAuthSession()
                if (refreshed && !hasResolved) {
                    socket.connect()
                    return
                }
            }
            if (!hasResolved && !socket.active) {
                hasResolved = true
                cleanup()
                reject(new ApiError(err.message || 'Socket connection failed', 500))
            }
        }

        const handleAgentEvent = (rawEvent: any) => {
            const streamEvent = normalizeAgentStreamEvent(rawEvent)
            onEvent(streamEvent)

            if (streamEvent.data?.generatedFiles) {
                useAppStore.getState().replaceGeneratedOutput(streamEvent.data.generatedFiles)
            }

            if (streamEvent.type === 'result' || streamEvent.type === 'AgentEnd') {
                resultData = streamEvent.data
                hasResolved = true
                cleanup()
                resolve(resultData)
            }
            if (streamEvent.type === 'error' || streamEvent.type === 'AgentError') {
                hasResolved = true
                cleanup()
                reject(
                    new ApiError(
                        (streamEvent.data as any)?.error ||
                            streamEvent.data?.message ||
                            'Agent Execution Error',
                        500
                    )
                )
            }
        }

        const handleError = (err: any) => {
            if (!hasResolved) {
                hasResolved = true
                cleanup()
                reject(new ApiError(err.message || 'Socket error', 500))
            }
        }

        const handleDisconnect = (reason: string) => {
            if (reason === 'io server disconnect' && !hasResolved) {
                hasResolved = true
                cleanup()
                reject(new Error('Socket disconnected by server'))
            }
        }

        if (signal) {
            signal.addEventListener('abort', () => {
                if (!hasResolved) {
                    hasResolved = true
                    socket.emit('stop_session', { sessionId })
                    cleanup()
                    reject(new Error('Aborted'))
                }
            })
        }

        socket.on('connect_error', handleConnectError)
        socket.on('agent_event', handleAgentEvent)
        socket.on('error', handleError)
        socket.on('disconnect', handleDisconnect)
        socket.io.on('reconnect', handleReconnect)
        socket.io.on('reconnect_failed', handleReconnectFailed)

        if (socket.connected) {
            handleConnect()
        } else {
            socket.on('connect', handleConnect)
            if (socket.disconnected) {
                socket.connect()
            }
        }
    })
}

const generateProjectStream = async ({
    prompt,
    sessionId,
    projectId,
    model,
    signal,
    onEvent,
}: GenerateProjectInput) => {
    let targetSessionId = sessionId || projectId

    if (!targetSessionId) {
        // create new session if no session id provided
        const newSession = await sessionAPI.createSession({
            prompt,
            type: 'WEB',
        })
        targetSessionId = newSession.id

        onEvent({
            type: 'project-created',
            data: {
                project: newSession as unknown as BackendProject,
                version: {
                    id: newSession.id,
                    versionNumber: 1,
                    label: 'Initial',
                },
            },
        })
    }

    return await runOverSocket(targetSessionId, prompt, onEvent, signal)
}

const applyProjectEdit = async (data: ApplyProjectEditInput) => {
    const targetSessionId = data.sessionId || data.projectId
    if (!targetSessionId) throw new Error('sessionId is required for edit')
    // treat edit as a regular prompt in the session
    const prompt = `[EDIT] ${data.prompt}${data.selectedElement ? ` (Element: ${data.selectedElement.tagName})` : ''}`
    return await runOverSocket(targetSessionId, prompt, data.onEvent, data.signal)
}

const applyProjectFix = async (data: ApplyProjectFixInput) => {
    const targetSessionId = data.sessionId || data.projectId
    if (!targetSessionId) throw new Error('sessionId is required for fix')
    // treat fix as a regular prompt in the session
    const prompt = `[FIX ERROR] ${data.errorMessage}\n\nStack:\n${data.stack || ''}`
    return await runOverSocket(targetSessionId, prompt, data.onEvent, data.signal)
}

export const generationAPI = {
    generateProjectStream,
    applyProjectEdit,
    applyProjectFix,
}
