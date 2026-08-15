import { StateCreator } from 'zustand'

import { Message } from '@/features/chat/types'
import { getUserFacingGenerationError } from '@/features/chat/utils'
import { OutputOperation } from '@/features/preview/types'

export interface ChatSlice {
    messages: Message[]
    generationPhase: 'thinking' | 'building' | 'done' | null
    activeOperation: OutputOperation | null
    isGenerating: boolean
    expandCommands: boolean
    currentGenerationFilePaths: string[]
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
    setExpandCommands: (expand: boolean) => void
    toggleExpandCommands: () => void
    setGenerationPhase: (phase: ChatSlice['generationPhase']) => void
    setActiveOperation: (operation: ChatSlice['activeOperation']) => void
    setIsGenerating: (isGenerating: boolean) => void
    setCurrentGenerationFilePaths: (paths: string[]) => void
    updateAssistantMessage: (messageId: string, updater: (message: Message) => Message) => void
    setAssistantStatus: (
        messageId: string,
        status: 'thinking' | 'building' | 'done' | 'error'
    ) => void
    setAssistantStatusMessage: (messageId: string, statusMessage?: string) => void
    appendThinkingChunk: (messageId: string, chunk: string) => void
    appendStreamChunk: (messageId: string, chunk: string) => void
    addToolCallBlock: (
        messageId: string,
        toolCall: {
            toolCallId: string
            toolName: string
            toolInput?: any
            status?: 'running' | 'success' | 'error'
            output?: string
        }
    ) => void
    appendToolCallOutput: (messageId: string, toolCallId: string, chunk: string) => void
    updateToolCallResult: (
        messageId: string,
        result: {
            toolCallId?: string
            status?: 'success' | 'error'
            output?: string
            error?: string
            diff?: string
            filePath?: string
        }
    ) => void
    addFileChangeBlock: (
        messageId: string,
        fileChange: {
            filePath: string
            action: 'created' | 'modified' | 'deleted'
            diff?: string
        }
    ) => void
    addCompactionBlock: (messageId: string, summary: string) => void
    addInterruptBlock: (messageId: string) => void
    appendAssistantChunk: (messageId: string, chunk: string, streamMessageId?: string) => void
    setAssistantError: (messageId: string, errorMessage: string) => void
    setAssistantAppliedFiles: (messageId: string, appliedFiles: string[]) => void
}

export const createChatSlice: StateCreator<ChatSlice> = (set, get) => ({
    messages: [],
    generationPhase: null,
    activeOperation: null,
    isGenerating: false,
    expandCommands: true,
    currentGenerationFilePaths: [],
    setMessages: (updater) =>
        set((state) => ({
            messages: typeof updater === 'function' ? updater(state.messages) : updater,
        })),
    setExpandCommands: (expandCommands) => set({ expandCommands }),
    toggleExpandCommands: () => set((state) => ({ expandCommands: !state.expandCommands })),
    setGenerationPhase: (generationPhase) => set({ generationPhase }),
    setActiveOperation: (activeOperation) => set({ activeOperation }),
    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setCurrentGenerationFilePaths: (currentGenerationFilePaths) =>
        set({ currentGenerationFilePaths }),
    updateAssistantMessage: (messageId, updater) =>
        set((state) => ({
            messages: state.messages.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
        })),
    setAssistantStatus: (messageId, status) => {
        get().updateAssistantMessage(messageId, (message) => ({ ...message, status }))
    },
    setAssistantStatusMessage: (messageId, statusMessage) => {
        get().updateAssistantMessage(messageId, (message) => ({ ...message, statusMessage }))
    },
    appendThinkingChunk: (messageId, chunk) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock && lastBlock.type === 'thinking') {
                blocks[blocks.length - 1] = {
                    ...lastBlock,
                    content: `${lastBlock.content}${chunk}`,
                }
            } else {
                blocks.push({
                    type: 'thinking',
                    content: chunk,
                })
            }
            return {
                ...message,
                thoughts: `${message.thoughts ?? ''}${chunk}`,
                blocks,
            }
        })
    },
    appendStreamChunk: (messageId, chunk) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock && lastBlock.type === 'text') {
                blocks[blocks.length - 1] = {
                    ...lastBlock,
                    content: `${lastBlock.content}${chunk}`,
                }
            } else {
                blocks.push({
                    type: 'text',
                    content: chunk,
                })
            }
            return {
                ...message,
                content: `${message.content ?? ''}${chunk}`,
                blocks,
            }
        })
    },
    addToolCallBlock: (messageId, toolCall) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            const existingIndex = blocks.findIndex(
                (b) => b.type === 'command' && b.toolCallId === toolCall.toolCallId
            )
            if (existingIndex >= 0) {
                blocks[existingIndex] = {
                    type: 'command',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    toolInput: toolCall.toolInput,
                    status: toolCall.status || 'running',
                    output: toolCall.output || (blocks[existingIndex] as any).output || '',
                }
            } else {
                blocks.push({
                    type: 'command',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    toolInput: toolCall.toolInput,
                    status: toolCall.status || 'running',
                    output: toolCall.output || '',
                })
            }
            return {
                ...message,
                blocks,
            }
        })
    },
    appendToolCallOutput: (messageId, toolCallId, chunk) => {
        get().updateAssistantMessage(messageId, (message) => {
            if (!message.blocks || message.blocks.length === 0) return message
            const blocks = message.blocks.map((b) => {
                if (b.type === 'command' && b.toolCallId === toolCallId) {
                    return {
                        ...b,
                        output: `${b.output ?? ''}${chunk}`,
                    }
                }
                return b
            })
            return {
                ...message,
                blocks,
            }
        })
    },
    updateToolCallResult: (messageId, result) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            let found = false

            for (let i = blocks.length - 1; i >= 0; i--) {
                const b = blocks[i]
                if (
                    b.type === 'command' &&
                    (!result.toolCallId || b.toolCallId === result.toolCallId)
                ) {
                    blocks[i] = {
                        ...b,
                        status: result.status || (result.error ? 'error' : 'success'),
                        output: result.output || result.error || b.output,
                    }
                    found = true
                    break
                }
            }

            if (!found && result.toolCallId) {
                blocks.push({
                    type: 'command',
                    toolCallId: result.toolCallId,
                    toolName: 'tool',
                    status: result.status || (result.error ? 'error' : 'success'),
                    output: result.output || result.error || '',
                })
            }

            if (result.filePath) {
                blocks.push({
                    type: 'file_change',
                    filePath: result.filePath,
                    action: 'modified',
                    diff: result.diff,
                })
            }

            return {
                ...message,
                blocks,
            }
        })
    },
    addFileChangeBlock: (messageId, fileChange) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            blocks.push({
                type: 'file_change',
                filePath: fileChange.filePath,
                action: fileChange.action,
                diff: fileChange.diff,
            })
            return {
                ...message,
                blocks,
            }
        })
    },
    addCompactionBlock: (messageId, summary) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            blocks.push({
                type: 'compaction',
                summary,
            })
            return {
                ...message,
                blocks,
            }
        })
    },
    addInterruptBlock: (messageId) => {
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            blocks.push({
                type: 'interrupt',
            })
            return {
                ...message,
                blocks,
            }
        })
    },
    appendAssistantChunk: (messageId, chunk, streamMessageId) => {
        get().updateAssistantMessage(messageId, (message) => {
            const isThinkingStream = streamMessageId?.endsWith(':thoughts')
            const isPlanStream = streamMessageId?.endsWith(':plan_of_action')
            const isSummaryStream = streamMessageId?.endsWith(':summary')

            let nextThoughts = message.thoughts ?? ''
            let nextPlan = message.plan ?? ''
            let nextSummary = message.summary ?? ''

            if (isThinkingStream) {
                nextThoughts = `${nextThoughts}${chunk}`
            } else if (isPlanStream) {
                nextPlan = `${nextPlan}${chunk}`
            } else if (isSummaryStream) {
                nextSummary = `${nextSummary}${chunk}`
            }

            return {
                ...message,
                content: isSummaryStream ? message.content : `${message.content}${chunk}`,
                thoughts: nextThoughts || undefined,
                plan: nextPlan || undefined,
                summary: nextSummary || undefined,
            }
        })
    },
    setAssistantError: (messageId, errorMessage) => {
        const userFacingMessage = getUserFacingGenerationError(errorMessage)
        get().updateAssistantMessage(messageId, (message) => {
            const blocks = message.blocks ? [...message.blocks] : []
            blocks.push({
                type: 'error',
                error: userFacingMessage,
            })
            return {
                ...message,
                status: 'error',
                content: message.content.trim()
                    ? `${message.content.trim()}\n\n${userFacingMessage}`
                    : userFacingMessage,
                blocks,
            }
        })
    },
    setAssistantAppliedFiles: (messageId, appliedFiles) => {
        get().updateAssistantMessage(messageId, (message) => ({ ...message, appliedFiles }))
    },
})
