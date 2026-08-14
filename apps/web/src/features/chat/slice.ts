import { StateCreator } from 'zustand'

import { Message } from '@/features/chat/types'
import { getUserFacingGenerationError } from '@/features/chat/utils'
import { OutputOperation } from '@/features/preview/types'

export interface ChatSlice {
    messages: Message[]
    generationPhase: 'thinking' | 'building' | 'done' | null
    activeOperation: OutputOperation | null
    isGenerating: boolean
    currentGenerationFilePaths: string[]
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
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
    appendAssistantChunk: (messageId: string, chunk: string, streamMessageId?: string) => void
    setAssistantError: (messageId: string, errorMessage: string) => void
    setAssistantAppliedFiles: (messageId: string, appliedFiles: string[]) => void
}

export const createChatSlice: StateCreator<ChatSlice> = (set, get) => ({
    messages: [],
    generationPhase: null,
    activeOperation: null,
    isGenerating: false,
    currentGenerationFilePaths: [],
    setMessages: (updater) =>
        set((state) => ({
            messages: typeof updater === 'function' ? updater(state.messages) : updater,
        })),
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
        get().updateAssistantMessage(messageId, (message) => ({
            ...message,
            thoughts: `${message.thoughts ?? ''}${chunk}`,
        }))
    },
    appendStreamChunk: (messageId, chunk) => {
        get().updateAssistantMessage(messageId, (message) => ({
            ...message,
            content: `${message.content ?? ''}${chunk}`,
        }))
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
        get().updateAssistantMessage(messageId, (message) => ({
            ...message,
            status: 'error',
            content: message.content.trim()
                ? `${message.content.trim()}\n\n${userFacingMessage}`
                : userFacingMessage,
        }))
    },
    setAssistantAppliedFiles: (messageId, appliedFiles) => {
        get().updateAssistantMessage(messageId, (message) => ({ ...message, appliedFiles }))
    },
})
