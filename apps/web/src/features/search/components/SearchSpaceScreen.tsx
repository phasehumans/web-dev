import { useQueryClient } from '@tanstack/react-query'
import {
    ChevronLeft,
    ThumbsUp,
    ThumbsDown,
    Copy,
    Check,
    Settings,
    Flag,
    MoreHorizontal,
    Search as SearchIcon,
    AlertCircle,
} from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SearchMarkdown } from './SearchMarkdown'

import { useAppStore } from '@/app/store'
import { ChatPromptInput } from '@/features/chat/components/ChatPromptInput'
import { sessionAPI } from '@/features/sessions/api/session'
import { cn } from '@/shared/lib/utils'

interface SearchSpaceScreenProps {
    onBack?: () => void
    initialPrompt?: string
}

export interface SearchMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    isStreaming?: boolean
    error?: string
}

export const SearchSpaceScreen: React.FC<SearchSpaceScreenProps> = ({ onBack, initialPrompt }) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const sessionId = searchParams.get('session')
    const promptParam = searchParams.get('prompt')
    const queryClient = useQueryClient()
    const { setShowOutOfCreditsModal } = useAppStore()

    const [promptText, setPromptText] = useState('')
    const [sessionTitle, setSessionTitle] = useState<string>('')
    const [messages, setMessages] = useState<SearchMessage[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | null>>({})

    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const isUserScrolledUpRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const isDispatchedInitialRef = useRef(false)

    // Load existing session messages if sessionId is present
    useEffect(() => {
        if (!sessionId) {
            if (initialPrompt && messages.length === 0) {
                setMessages([
                    {
                        id: '1',
                        role: 'user',
                        content: initialPrompt,
                    },
                ])
            }
            return
        }

        let isMounted = true
        const fetchSession = async () => {
            try {
                const detail = await sessionAPI.getSessionDetail(sessionId)
                if (!isMounted) return

                const title =
                    (detail as any).session?.title ||
                    detail.project?.title ||
                    detail.project?.name ||
                    'Search'
                setSessionTitle(title)

                if (detail.chatMessages && detail.chatMessages.length > 0) {
                    const loadedMessages: SearchMessage[] = detail.chatMessages.map((m) => ({
                        id: m.id,
                        role: m.role.toLowerCase() as 'user' | 'assistant',
                        content: m.content,
                    }))
                    setMessages(loadedMessages)
                }
            } catch (err) {
                console.error('[Search] Failed to load search session:', err)
            }
        }

        void fetchSession()
        return () => {
            isMounted = false
        }
    }, [sessionId, initialPrompt])

    // Scroll management
    const scrollToBottom = useCallback((smooth = true) => {
        if (scrollContainerRef.current && !isUserScrolledUpRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto',
            })
        }
    }, [])

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
        isUserScrolledUpRef.current = distanceFromBottom > 60
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    const handleCopy = (id: string, text: string) => {
        void navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const executeStream = useCallback(
        async (
            targetSessionId: string,
            prompt: string,
            history: Array<{ role: 'user' | 'assistant'; content: string }>
        ) => {
            abortControllerRef.current?.abort()
            const abortController = new AbortController()
            abortControllerRef.current = abortController

            setIsStreaming(true)
            isUserScrolledUpRef.current = false

            const assistantMsgId = `ast-${Date.now()}`
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMsgId,
                    role: 'assistant',
                    content: '',
                    isStreaming: true,
                },
            ])

            try {
                await sessionAPI.streamSearch(
                    targetSessionId,
                    {
                        prompt,
                        messageHistory: history,
                    },
                    {
                        signal: abortController.signal,
                        onToken: (token) => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId
                                        ? { ...m, content: m.content + token }
                                        : m
                                )
                            )
                        },
                        onThought: (thought) => {
                            setMessages((prev) =>
                                prev.map((m) => {
                                    if (m.id !== assistantMsgId) return m
                                    if (
                                        m.content.startsWith('<thought>') &&
                                        m.content.includes('</thought>')
                                    ) {
                                        return {
                                            ...m,
                                            content: m.content.replace(
                                                '</thought>',
                                                `${thought}</thought>`
                                            ),
                                        }
                                    } else if (m.content.startsWith('<thought>')) {
                                        return { ...m, content: m.content + thought }
                                    } else if (m.content === '') {
                                        return { ...m, content: `<thought>${thought}` }
                                    }
                                    return {
                                        ...m,
                                        content: `${m.content} <thought>${thought}</thought>`,
                                    }
                                })
                            )
                        },
                        onDone: () => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                                )
                            )
                            void queryClient.invalidateQueries({ queryKey: ['sessions'] })
                        },
                        onError: (errorMsg) => {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId
                                        ? { ...m, isStreaming: false, error: errorMsg }
                                        : m
                                )
                            )
                        },
                    }
                )
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                        )
                    )
                    return
                }

                const errorMessage = err?.message || 'Failed to stream search response'
                if (
                    err?.status === 402 ||
                    errorMessage.toLowerCase().includes('insufficient credits')
                ) {
                    setShowOutOfCreditsModal(true)
                }

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantMsgId
                            ? {
                                  ...m,
                                  isStreaming: false,
                                  error: errorMessage,
                                  content: m.content || errorMessage,
                              }
                            : m
                    )
                )
            } finally {
                setIsStreaming(false)
                abortControllerRef.current = null
            }
        },
        [queryClient, setShowOutOfCreditsModal]
    )

    const handleSendPrompt = useCallback(
        async (customText?: string) => {
            const textToSubmit = (customText || promptText).trim()
            if (!textToSubmit || isStreaming) return

            setPromptText('')

            const userMsgId = `user-${Date.now()}`
            const userMsg: SearchMessage = {
                id: userMsgId,
                role: 'user',
                content: textToSubmit,
            }

            const currentHistory = messages
                .filter((m) => !m.error && m.content && m.content.trim().length > 0)
                .map((m) => ({
                    role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
                    content: m.content,
                }))

            if (!sessionId) {
                try {
                    setMessages((prev) => [...prev, userMsg])
                    const createdSession = await sessionAPI.createSession({
                        type: 'SEARCH',
                        title: textToSubmit.slice(0, 50),
                    })

                    setSessionTitle(createdSession.title || textToSubmit.slice(0, 50))
                    setSearchParams({ session: createdSession.id }, { replace: true })
                    void queryClient.invalidateQueries({ queryKey: ['sessions'] })

                    await executeStream(createdSession.id, textToSubmit, currentHistory)
                } catch (error: any) {
                    console.error('[Search] Failed to create search session:', error)
                    if (
                        error?.status === 402 ||
                        error?.message?.toLowerCase()?.includes('insufficient')
                    ) {
                        setShowOutOfCreditsModal(true)
                    }
                    const errorMsg = error?.message || 'Failed to create search session'
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `err-${Date.now()}`,
                            role: 'assistant',
                            content: errorMsg,
                            error: errorMsg,
                        },
                    ])
                }
            } else {
                setMessages((prev) => [...prev, userMsg])
                await executeStream(sessionId, textToSubmit, currentHistory)
            }
        },
        [
            promptText,
            isStreaming,
            messages,
            sessionId,
            setSearchParams,
            queryClient,
            executeStream,
            setShowOutOfCreditsModal,
        ]
    )

    // Automatically trigger initial prompt from URL or prop if not yet dispatched
    useEffect(() => {
        if (isDispatchedInitialRef.current) return

        if (promptParam && promptParam.trim()) {
            isDispatchedInitialRef.current = true
            void handleSendPrompt(promptParam.trim())
        } else if (initialPrompt && initialPrompt.trim() && !sessionId && messages.length <= 1) {
            isDispatchedInitialRef.current = true
            void handleSendPrompt(initialPrompt.trim())
        }
    }, [promptParam, initialPrompt, sessionId, messages.length, handleSendPrompt])

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setIsStreaming(false)
    }

    const currentTitle = sessionTitle || initialPrompt || promptParam || 'Search'

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] relative overflow-hidden min-h-0 font-sans">
            {/* Top Header */}
            <div className="h-11 flex items-center justify-between px-4 bg-[#141414] border-b border-[#222225] shrink-0 z-30 select-none">
                <div className="flex items-center gap-2 min-w-0">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-1 text-[#8E8D8C] hover:text-white rounded-md hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                            title="Back"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                        <SearchIcon size={14} className="text-[#87B2F4] shrink-0" />
                        <span className="text-xs font-normal text-[#D6D5D4] lowercase hover:bg-[#222225] hover:text-white px-2 py-1 rounded-md transition-colors cursor-pointer truncate max-w-[280px] md:max-w-md">
                            {currentTitle.toLowerCase()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        className="p-1.5 text-[#91908F] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 text-[#91908F] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Flag"
                    >
                        <Flag size={16} />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 text-[#91908F] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="More options"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Main Centered Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                {/* Messages Feed */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-[#2C2C30]"
                >
                    <div className="max-w-2xl mx-auto w-full space-y-6">
                        {messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex flex-col items-end w-full">
                                        <div className="bg-[#1C1C1E] border border-white/5 px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed text-[#EDEDED] max-w-[85%] break-words shadow-sm">
                                            {msg.content}
                                        </div>
                                    </div>
                                )
                            }

                            const isLiked = feedback[msg.id] === 'like'
                            const isDisliked = feedback[msg.id] === 'dislike'

                            return (
                                <div
                                    key={msg.id}
                                    className="flex flex-col gap-2 w-full animate-in fade-in duration-300"
                                >
                                    {msg.error && (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-300">
                                            <AlertCircle
                                                size={14}
                                                className="shrink-0 text-red-400"
                                            />
                                            <span>{msg.error}</span>
                                        </div>
                                    )}

                                    <SearchMarkdown
                                        content={msg.content}
                                        isStreaming={msg.isStreaming}
                                    />

                                    {/* Action Buttons */}
                                    {!msg.isStreaming && msg.content && (
                                        <div className="flex items-center gap-1 pt-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFeedback((prev) => ({
                                                        ...prev,
                                                        [msg.id]: isLiked ? null : 'like',
                                                    }))
                                                }
                                                className={cn(
                                                    'p-1.5 rounded-md transition-colors cursor-pointer',
                                                    isLiked
                                                        ? 'text-[#87B2F4] bg-[#87B2F4]/10'
                                                        : 'text-[#8E8D8C] hover:text-white hover:bg-white/5'
                                                )}
                                                title="Helpful response"
                                            >
                                                <ThumbsUp size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFeedback((prev) => ({
                                                        ...prev,
                                                        [msg.id]: isDisliked ? null : 'dislike',
                                                    }))
                                                }
                                                className={cn(
                                                    'p-1.5 rounded-md transition-colors cursor-pointer',
                                                    isDisliked
                                                        ? 'text-red-400 bg-red-400/10'
                                                        : 'text-[#8E8D8C] hover:text-white hover:bg-white/5'
                                                )}
                                                title="Unhelpful response"
                                            >
                                                <ThumbsDown size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCopy(msg.id, msg.content)}
                                                className="p-1.5 text-[#8E8D8C] hover:text-white rounded-md transition-colors cursor-pointer hover:bg-white/5"
                                                title="Copy to clipboard"
                                            >
                                                {copiedId === msg.id ? (
                                                    <Check size={13} className="text-emerald-400" />
                                                ) : (
                                                    <Copy size={13} />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Bottom Prompt Input */}
                <div className="shrink-0 bg-[#141414] p-4 border-t border-[#222225]/50">
                    <div className="max-w-2xl mx-auto w-full">
                        <ChatPromptInput
                            value={promptText}
                            onChange={setPromptText}
                            onSubmit={() => void handleSendPrompt()}
                            isGenerating={isStreaming}
                            onStop={handleStopGeneration}
                            isVisualMode={false}
                            setIsVisualMode={() => {}}
                            selectedElement={null}
                            handleClearSelection={() => {}}
                            isApplyingEdit={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
