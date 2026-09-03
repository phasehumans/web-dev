import { useQueryClient } from '@tanstack/react-query'
import {
    ThumbsUp,
    ThumbsDown,
    Copy,
    Check,
    MoreHorizontal,
    Share2,
    Archive,
    ArchiveRestore,
    Trash2,
} from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

import { SearchMarkdown } from './SearchMarkdown'

import { useAppStore } from '@/app/store'
import { ChatPromptInput } from '@/features/chat/components/ChatPromptInput'
import { sessionAPI } from '@/features/sessions/api/session'
import { SessionDeleteModal } from '@/features/sessions/components/SessionDeleteModal'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

interface SearchSpaceScreenProps {
    onBack?: () => void
    initialPrompt?: string
}

export interface SearchMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    thoughts?: string
    isStreaming?: boolean
    isThinking?: boolean
    error?: string
}

export const SearchSpaceScreen: React.FC<SearchSpaceScreenProps> = ({ onBack, initialPrompt }) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const sessionId = searchParams.get('session')
    const promptParam = searchParams.get('prompt')
    const queryClient = useQueryClient()
    const {
        setShowOutOfCreditsModal,
        setIsMobileSidebarOpen,
        setIsProjectOpening,
        isAuthenticated,
        isAuthRestored,
        setShowAuthModal,
    } = useAppStore()

    useEffect(() => {
        if (isAuthRestored && !isAuthenticated) {
            navigate('/', { replace: true })
        }
    }, [isAuthRestored, isAuthenticated, navigate])

    const initialCachedDetail = sessionId
        ? queryClient.getQueryData<any>(['session', sessionId])
        : null
    const initialCachedSession = initialCachedDetail
        ? (initialCachedDetail as any).session || initialCachedDetail.project
        : null

    const [promptText, setPromptText] = useState('')
    const [sessionTitle, setSessionTitle] = useState<string>(
        initialCachedSession?.title ||
            initialCachedDetail?.project?.title ||
            initialCachedDetail?.project?.name ||
            ''
    )
    const [sessionData, setSessionData] = useState<any | null>(initialCachedSession || null)
    const [messages, setMessages] = useState<SearchMessage[]>(() => {
        if (initialCachedDetail?.chatMessages && initialCachedDetail.chatMessages.length > 0) {
            return initialCachedDetail.chatMessages.map((m: any) => ({
                id: m.id,
                role: m.role.toLowerCase() as 'user' | 'assistant',
                content: m.content,
            }))
        }
        return []
    })
    const [isStreaming, setIsStreaming] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | null>>({})

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeletePending, setIsDeletePending] = useState(false)
    const [isCopiedShare, setIsCopiedShare] = useState(false)
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
    const [isThinkingMode, setIsThinkingMode] = useState(false)
    const moreMenuRef = useRef<HTMLDivElement | null>(null)

    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const isUserScrolledUpRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)
    const isDispatchedInitialRef = useRef(false)
    const isLocallyCreatedSessionRef = useRef<string | null>(null)

    // Handle click outside for more options dropdown
    useEffect(() => {
        if (!isMoreMenuOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMoreMenuOpen])

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

        // If this session was created locally during active stream interaction, skip clobbering local messages
        if (isLocallyCreatedSessionRef.current === sessionId) {
            return
        }

        // Check if data is already in cache
        const cached = queryClient.getQueryData<any>(['session', sessionId])
        if (cached) {
            const sessionObj = (cached as any).session || cached.project
            setSessionData(sessionObj || null)
            const title =
                sessionObj?.title || cached.project?.title || cached.project?.name || 'Search'
            setSessionTitle(title)
            if (cached.chatMessages && cached.chatMessages.length > 0) {
                setMessages(
                    cached.chatMessages.map((m: any) => ({
                        id: m.id,
                        role: m.role.toLowerCase() as 'user' | 'assistant',
                        content: m.content,
                    }))
                )
            }
        }

        let isMounted = true
        const fetchSession = async () => {
            const startTime = Date.now()
            if (!cached?.chatMessages?.length) {
                setIsProjectOpening(true)
            }
            try {
                const detail = await sessionAPI.getSessionDetail(sessionId)
                if (!isMounted) return

                queryClient.setQueryData(['session', sessionId], detail)
                const sessionObj = (detail as any).session || detail.project
                setSessionData(sessionObj || null)

                const title =
                    sessionObj?.title || detail.project?.title || detail.project?.name || 'Search'
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
            } finally {
                if (isMounted) {
                    setIsProjectOpening(false)
                }
            }
        }

        void fetchSession()
        return () => {
            isMounted = false
            setIsProjectOpening(false)
        }
    }, [sessionId, initialPrompt, queryClient, setIsProjectOpening])

    // Scroll management
    const scrollToBottom = useCallback((instant = false) => {
        if (scrollContainerRef.current && !isUserScrolledUpRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth',
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
        scrollToBottom(isStreaming)
    }, [messages, isStreaming, scrollToBottom])

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
                    thoughts: '',
                    isStreaming: true,
                    isThinking: true,
                },
            ])

            let pendingTokenBuffer = ''
            let pendingThoughtBuffer = ''
            let frameHandle: number | null = null

            const flushBuffer = () => {
                if (!pendingTokenBuffer && !pendingThoughtBuffer) return
                const tokenFlush = pendingTokenBuffer
                const thoughtFlush = pendingThoughtBuffer
                pendingTokenBuffer = ''
                pendingThoughtBuffer = ''

                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id !== assistantMsgId) return m
                        return {
                            ...m,
                            content: m.content + tokenFlush,
                            thoughts: (m.thoughts || '') + thoughtFlush,
                            isThinking: Boolean(thoughtFlush) && !tokenFlush ? true : false,
                        }
                    })
                )
            }

            const scheduleFlush = () => {
                if (frameHandle !== null) return
                frameHandle = requestAnimationFrame(() => {
                    frameHandle = null
                    flushBuffer()
                })
            }

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
                            pendingTokenBuffer += token
                            scheduleFlush()
                        },
                        onThought: (thought) => {
                            pendingThoughtBuffer += thought
                            scheduleFlush()
                        },
                        onDone: () => {
                            if (frameHandle !== null) {
                                cancelAnimationFrame(frameHandle)
                                frameHandle = null
                            }
                            flushBuffer()
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId
                                        ? { ...m, isStreaming: false, isThinking: false }
                                        : m
                                )
                            )
                            void queryClient.invalidateQueries({ queryKey: ['sessions'] })
                        },
                        onError: (errorMsg) => {
                            if (frameHandle !== null) {
                                cancelAnimationFrame(frameHandle)
                                frameHandle = null
                            }
                            flushBuffer()
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMsgId
                                        ? {
                                              ...m,
                                              isStreaming: false,
                                              isThinking: false,
                                              error: errorMsg,
                                          }
                                        : m
                                )
                            )
                        },
                    }
                )
            } catch (err: any) {
                if (frameHandle !== null) {
                    cancelAnimationFrame(frameHandle)
                    frameHandle = null
                }
                flushBuffer()
                if (err?.name === 'AbortError') {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantMsgId
                                ? { ...m, isStreaming: false, isThinking: false }
                                : m
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
                                  isThinking: false,
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

                    isLocallyCreatedSessionRef.current = createdSession.id
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

    const handleShare = async () => {
        try {
            const url = window.location.href
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url)
                setIsCopiedShare(true)
                setTimeout(() => setIsCopiedShare(false), 2000)
            }
        } catch (err) {
            console.error('[Search] Failed to copy share link:', err)
        }
    }

    const handleToggleArchive = async () => {
        if (!sessionId) return
        setIsMoreMenuOpen(false)
        try {
            if (sessionData?.isArchived) {
                await sessionAPI.unarchiveSession(sessionId)
                setSessionData((prev: any) => (prev ? { ...prev, isArchived: false } : prev))
            } else {
                await sessionAPI.archiveSession(sessionId)
                setSessionData((prev: any) => (prev ? { ...prev, isArchived: true } : prev))
            }
            void queryClient.invalidateQueries({ queryKey: ['sessions'] })
        } catch (err) {
            console.error('[Search] Failed to toggle archive:', err)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!sessionId) return
        setIsDeletePending(true)
        try {
            await sessionAPI.deleteSession(sessionId)
            void queryClient.invalidateQueries({ queryKey: ['sessions'] })
            setIsDeleteModalOpen(false)
            navigate('/')
        } catch (err) {
            console.error('[Search] Failed to delete session:', err)
        } finally {
            setIsDeletePending(false)
        }
    }

    if (isAuthRestored && !isAuthenticated) {
        return null
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] relative overflow-hidden min-h-0 font-sans">
            {/* Top Header */}
            <div className="h-11 flex items-center justify-between px-3 sm:px-4 bg-[#141414] shrink-0 z-30 select-none">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="md:hidden p-1.5 -ml-1 text-[#8F8E8D] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        title="Open sidebar"
                        aria-label="Open sidebar"
                    >
                        <Icons.SidebarToggle className="w-[18px] h-[18px]" />
                    </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                            className={cn(
                                'p-1.5 text-[#91908F] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer',
                                isMoreMenuOpen && 'text-white bg-white/5'
                            )}
                            title="More options"
                            aria-label="More options"
                        >
                            <MoreHorizontal size={16} />
                        </button>

                        {isMoreMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-[180px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl z-50 p-1.5 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 select-none">
                                {/* Top Action Items */}
                                <div className="flex flex-col gap-0.5 relative">
                                    {/* 1. Share */}
                                    <button
                                        type="button"
                                        onClick={handleShare}
                                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer text-[#EDEDEF] hover:bg-white/5 hover:text-white"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-[#8E8D8C] shrink-0">
                                                <Share2 className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="truncate">Share</span>
                                        </div>
                                        {isCopiedShare && (
                                            <span className="text-[11px] font-medium text-emerald-400">
                                                Copied!
                                            </span>
                                        )}
                                    </button>

                                    {/* 2. Archive */}
                                    <button
                                        type="button"
                                        onClick={handleToggleArchive}
                                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer text-[#EDEDEF] hover:bg-white/5 hover:text-white"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-[#8E8D8C] shrink-0">
                                                {sessionData?.isArchived ? (
                                                    <ArchiveRestore className="w-3.5 h-3.5" />
                                                ) : (
                                                    <Archive className="w-3.5 h-3.5" />
                                                )}
                                            </span>
                                            <span className="truncate">
                                                {sessionData?.isArchived ? 'Unarchive' : 'Archive'}
                                            </span>
                                        </div>
                                    </button>

                                    {/* 3. Delete */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMoreMenuOpen(false)
                                            setIsDeleteModalOpen(true)
                                        }}
                                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer text-red-400 hover:bg-white/5 hover:text-red-300"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-red-400 shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="truncate">Delete</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Centered Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                {/* Messages Feed */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 md:p-6 space-y-6 sm:space-y-6 chat-scrollbar overscroll-contain"
                >
                    <div className="max-w-2xl mx-auto w-full space-y-6 sm:space-y-6">
                        {messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div
                                        key={msg.id}
                                        className="flex flex-col gap-1 items-end w-full font-sans"
                                    >
                                        <div className="bg-[#1B1B1B] px-4.5 py-3 sm:px-4 sm:py-2.5 rounded-2xl sm:rounded-xl text-[14.5px] sm:text-[13.5px] leading-relaxed text-[#EDEDED] selection:bg-blue-500/20 shadow-sm max-w-[92%] sm:max-w-[85%] break-words whitespace-pre-wrap border-none">
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
                                    className="flex flex-col gap-2.5 sm:gap-2 w-full animate-in fade-in duration-300 font-sans"
                                >
                                    {msg.content && msg.content !== msg.error && (
                                        <SearchMarkdown
                                            content={msg.content}
                                            thoughts={msg.thoughts}
                                            isStreaming={msg.isStreaming}
                                            isThinking={msg.isThinking}
                                        />
                                    )}

                                    {msg.error ? (
                                        <div className="text-[14.5px] sm:text-[13.5px] text-red-400 leading-relaxed select-text py-0.5">
                                            {msg.error}
                                        </div>
                                    ) : !msg.content ? (
                                        <SearchMarkdown
                                            content=""
                                            thoughts={msg.thoughts}
                                            isStreaming={msg.isStreaming}
                                            isThinking={msg.isThinking}
                                        />
                                    ) : null}

                                    {/* Action Buttons */}
                                    {!msg.isStreaming &&
                                        !msg.error &&
                                        (msg.content || msg.thoughts) && (
                                            <div className="flex items-center gap-1 sm:gap-0.5 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFeedback((prev) => ({
                                                            ...prev,
                                                            [msg.id]: isLiked ? null : 'like',
                                                        }))
                                                    }
                                                    className={cn(
                                                        'p-2 sm:p-1.5 rounded-lg sm:rounded-md transition-colors cursor-pointer touch-manipulation',
                                                        isLiked
                                                            ? 'text-white'
                                                            : 'text-[#8E8D8C] hover:text-white hover:bg-white/5 active:bg-white/10'
                                                    )}
                                                    title="Helpful response"
                                                    aria-label="Helpful response"
                                                >
                                                    <ThumbsUp
                                                        size={13.5}
                                                        fill={isLiked ? 'currentColor' : 'none'}
                                                        className={
                                                            isLiked ? 'text-white fill-white' : ''
                                                        }
                                                    />
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
                                                        'p-2 sm:p-1.5 rounded-lg sm:rounded-md transition-colors cursor-pointer touch-manipulation',
                                                        isDisliked
                                                            ? 'text-white'
                                                            : 'text-[#8E8D8C] hover:text-white hover:bg-white/5 active:bg-white/10'
                                                    )}
                                                    title="Unhelpful response"
                                                    aria-label="Unhelpful response"
                                                >
                                                    <ThumbsDown
                                                        size={13.5}
                                                        fill={isDisliked ? 'currentColor' : 'none'}
                                                        className={
                                                            isDisliked
                                                                ? 'text-white fill-white'
                                                                : ''
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(msg.id, msg.content)}
                                                    className="p-2 sm:p-1.5 text-[#8E8D8C] hover:text-white rounded-lg sm:rounded-md transition-colors cursor-pointer hover:bg-white/5 active:bg-white/10 touch-manipulation"
                                                    title="Copy to clipboard"
                                                    aria-label="Copy to clipboard"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <Check
                                                            size={13.5}
                                                            className="text-emerald-400"
                                                        />
                                                    ) : (
                                                        <Copy size={13.5} />
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
                <div className="shrink-0 bg-[#141414] p-3 sm:p-4 pb-[max(12px,env(safe-area-inset-bottom,12px))] sm:pb-4">
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
                            isApplyingEdit={isStreaming}
                            isAuthenticated={isAuthenticated}
                            onOpenAuth={() => setShowAuthModal(true)}
                            mode="search"
                            isThinkingMode={isThinkingMode}
                            onToggleThinking={setIsThinkingMode}
                            placeholder="Ask anything..."
                            autoFocus={true}
                        />
                    </div>
                </div>
            </div>

            {/* Session Delete Modal */}
            <SessionDeleteModal
                isOpen={isDeleteModalOpen}
                projectTitle={sessionTitle || initialPrompt || 'Search Session'}
                isPending={isDeletePending}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
