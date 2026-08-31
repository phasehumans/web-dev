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

type GenerateProjectInput = {
    prompt: string
    sessionId?: string | null
    projectId?: string | null
    canvasState?: any
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
        let resultData: any = null

        const cleanup = () => {
            socket.off('connect', handleConnect)
            socket.off('connect_error', handleConnectError)
            socket.off('agent_event', handleAgentEvent)
            socket.off('error', handleError)
            socket.off('disconnect', handleDisconnect)
        }

        const handleConnect = () => {
            onEvent({ type: 'connected', data: { ok: true } })

            socket.emit('join_session', sessionId)

            socket.emit('send_prompt', {
                sessionId: sessionId,
                projectId: sessionId,
                prompt: prompt,
            })
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
            if (!hasResolved) {
                hasResolved = true
                cleanup()
                reject(new ApiError(err.message || 'Socket connection failed', 500))
            }
        }

        const handleAgentEvent = (event: any) => {
            let parsedData = event.data !== undefined ? event.data : event
            if (typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData)
                } catch {
                    // Intentionally swallowed: Keep as raw string if JSON parsing fails
                }
            }

            const eventType = event.type || parsedData?.type || 'StreamChunk'
            const streamEvent = { type: eventType, data: parsedData } as GenerationStreamEvent
            onEvent(streamEvent)

            if (parsedData?.generatedFiles) {
                useAppStore.getState().replaceGeneratedOutput(parsedData.generatedFiles)
            }

            if (eventType === 'result' || eventType === 'AgentEnd') {
                resultData = parsedData
                hasResolved = true
                cleanup()
                resolve(resultData)
            }
            if (eventType === 'error' || eventType === 'AgentError') {
                hasResolved = true
                cleanup()
                reject(
                    new ApiError(
                        parsedData?.error || parsedData?.message || 'Agent Execution Error',
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

        const handleDisconnect = () => {
            if (!hasResolved) {
                hasResolved = true
                cleanup()
                reject(new Error('Socket disconnected prematurely'))
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
