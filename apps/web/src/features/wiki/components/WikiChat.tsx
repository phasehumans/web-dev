import { useMutation } from '@tanstack/react-query'
import { Paperclip, KeyRound, Code2, Puzzle, Folder } from 'lucide-react'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'

import { apiFetch } from '@/shared/api/client'
import { Icons } from '@/shared/components/ui/Icons'

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: Date
}

export interface WikiChatProps {
    wikiId?: string
    repoFullName?: string
    repoName?: string
}

export const WikiChat: React.FC<WikiChatProps> = ({
    wikiId,
    repoFullName,
    repoName = 'repository',
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [prompt, setPrompt] = useState('')
    const [isMinimized, setIsMinimized] = useState(false)
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)
    const [plusMenuPosition, setPlusMenuPosition] = useState<'top' | 'bottom'>('top')
    const [selectedPlusIndex, setSelectedPlusIndex] = useState(0)

    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const plusRef = useRef<HTMLDivElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
        }
    }, [prompt])

    // Close plus menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (plusRef.current && !plusRef.current.contains(e.target as Node)) {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleOptionSelect = useCallback((trigger: string) => {
        setIsPlusMenuOpen(false)
        setPrompt((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
            return prev + separator + trigger
        })
        setTimeout(() => {
            textareaRef.current?.focus()
        }, 50)
    }, [])

    const handleUploadClick = useCallback(() => {
        setIsPlusMenuOpen(false)
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }, [])

    const plusMenuItems = useMemo(
        () => [
            {
                label: 'Upload attachment',
                icon: <Paperclip className="w-4 h-4 text-[#8F8E8D]" />,
                action: handleUploadClick,
            },
            {
                label: 'Repositories',
                icon: <Icons.Github className="w-4 h-4 text-[#8F8E8D]" />,
                action: () => handleOptionSelect('repos:'),
            },
            {
                label: 'Codebase files',
                icon: <Code2 className="w-4 h-4 text-[#8F8E8D]" />,
                action: () => handleOptionSelect('files:'),
            },
            {
                label: 'Sessions',
                icon: <Folder className="w-4 h-4 text-[#8F8E8D]" />,
                action: () => handleOptionSelect('sessions:'),
            },
            {
                label: 'Skills',
                icon: <Puzzle className="w-4 h-4 text-[#8F8E8D]" />,
                action: () => handleOptionSelect('skills:'),
            },
            {
                label: 'Secrets',
                icon: <KeyRound className="w-4 h-4 text-[#8F8E8D]" />,
                action: () => handleOptionSelect('secrets:'),
            },
            {
                label: 'Send secrets',
                icon: (
                    <KeyRound
                        className="w-4 h-4 text-[#8F8E8D]"
                        style={{ transform: 'scaleY(-1) rotate(-135deg)' }}
                    />
                ),
                action: () => handleOptionSelect('send-secrets:'),
            },
        ],
        [handleOptionSelect, handleUploadClick]
    )

    // Keyboard navigation for plus menu
    useEffect(() => {
        if (!isPlusMenuOpen) {
            setSelectedPlusIndex(0)
            return
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            const menuCount = plusMenuItems.length
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedPlusIndex((prev) => (prev + 1) % menuCount)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedPlusIndex((prev) => (prev - 1 + menuCount) % menuCount)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                plusMenuItems[selectedPlusIndex]?.action()
            } else if (e.key === 'Escape') {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown, true)
        return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [isPlusMenuOpen, selectedPlusIndex, plusMenuItems])

    const chatMutation = useMutation({
        mutationFn: async (userPrompt: string) => {
            const res = await apiFetch('/wiki/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wikiId,
                    repoFullName,
                    prompt: userPrompt,
                }),
            })
            if (!res.ok) {
                throw new Error('Failed to send message')
            }
            const json = await res.json()
            return json.data || json
        },
        onSuccess: (data) => {
            const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.answer || data.data?.answer || 'No answer generated.',
                createdAt: new Date(),
            }
            setMessages((prev) => [...prev, assistantMsg])
        },
        onError: () => {
            const errorMsg: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, I ran into an error generating a response. Please try again.',
                createdAt: new Date(),
            }
            setMessages((prev) => [...prev, errorMsg])
        },
    })

    const handleSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = prompt.trim()
        if (!trimmed || chatMutation.isPending) return

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            createdAt: new Date(),
        }

        setMessages((prev) => [...prev, userMsg])
        setPrompt('')
        chatMutation.mutate(trimmed)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const hasInput = prompt.trim().length > 0

    return (
        <div className="sticky bottom-5 z-40 w-[92%] max-w-[680px] mx-auto transition-all duration-300 font-sans pointer-events-auto mt-auto shrink-0 pb-1">
            {/* Hidden file input for attachment upload */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        const fileNames = Array.from(e.target.files)
                            .map((f) => f.name)
                            .join(', ')
                        setPrompt((prev) =>
                            prev ? `${prev} [Attached: ${fileNames}]` : `[Attached: ${fileNames}]`
                        )
                    }
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                    }
                }}
            />

            {/* Message History (above prompt, shown when messages exist) */}
            {!isMinimized && messages.length > 0 && (
                <div
                    className="mb-2 max-h-56 overflow-y-auto rounded-2xl bg-[#1F1F1F] border border-[#313131] p-3 space-y-2.5"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${
                                msg.role === 'user' ? 'items-end' : 'items-start'
                            }`}
                        >
                            <div
                                className={`max-w-[88%] rounded-xl px-3.5 py-2 text-[13px] leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-[#D6D5D4] text-black font-medium rounded-br-sm'
                                        : 'bg-[#2A2928] text-[#D6D5C9] rounded-bl-sm'
                                }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {chatMutation.isPending && (
                        <div className="flex items-start">
                            <div className="bg-[#2A2928] text-[#8F8E8D] rounded-xl px-3.5 py-2 text-[12.5px] flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-neutral-500 border-t-neutral-800 rounded-full animate-spin" />
                                <span>Searching codebase and generating response...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Main Prompt Box — exact match of hero PromptInput + PromptFooter */}
            <div className="relative group rounded-[17px] bg-[#1F1F1F] border border-[#313131] focus-within:border-white/10 transition-all duration-300 ease-out flex flex-col">
                {/* Minimize toggle */}
                {messages.length > 0 && (
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="absolute right-3 top-2 text-[#8E8E8E] hover:text-white text-xs font-semibold p-1 transition-colors cursor-pointer z-10"
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? '+' : '—'}
                    </button>
                )}

                {/* Textarea area — matches PromptInput exactly */}
                {!isMinimized && (
                    <div className="flex flex-wrap items-start w-full relative rounded-t-[16px] overflow-visible pt-[12px] pl-5 pr-12 pb-1 min-h-[72px] text-[14.5px]">
                        {/* Repo badge pill (like selected repos in PromptInput) */}
                        <div className="flex items-center gap-1.5 text-[#E8E8E8] font-sans font-medium mr-1.5 mb-1 bg-[#2A2928] px-2 py-0.5 rounded-[6px]">
                            <Icons.Github className="w-3.5 h-3.5 text-white" />
                            <span className="text-[14px] leading-relaxed">
                                {repoFullName || repoName}
                            </span>
                        </div>

                        <div className="relative flex-1 min-w-[100px]">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask about ${repoName}...`}
                                className="w-full bg-transparent text-[#D6D5D4] placeholder-[#949494] caret-white resize-none focus:outline-none z-10 font-sans font-medium leading-relaxed p-0 m-0 border-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
                                rows={1}
                            />
                        </div>
                    </div>
                )}

                {/* Footer bar — exact match of PromptFooter */}
                {!isMinimized && (
                    <div className="flex items-center justify-between px-3 pb-3 mt-0 pl-3 relative">
                        {/* Left controls: Plus Menu with Dropdown/Dropup */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center">
                                <div className="relative group/btn" ref={plusRef}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            if (!isPlusMenuOpen) {
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                const spaceBelow = window.innerHeight - rect.bottom
                                                if (spaceBelow < 260 && rect.top > spaceBelow) {
                                                    setPlusMenuPosition('top')
                                                } else {
                                                    setPlusMenuPosition('bottom')
                                                }
                                            }
                                            setIsPlusMenuOpen(!isPlusMenuOpen)
                                        }}
                                        className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none cursor-pointer"
                                        title="Attach or mention"
                                        aria-label="Add"
                                    >
                                        <Icons.Plus className="w-[18px] h-[18px] stroke-[2.5px]" />
                                    </button>

                                    {/* Hover Tooltip when menu closed */}
                                    {!isPlusMenuOpen && (
                                        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                            <span className="text-[12px] font-medium text-[#EDEDEF]">
                                                Attach or mention
                                            </span>
                                        </div>
                                    )}

                                    {/* Plus Menu Dropdown / Dropup matching PromptFooter */}
                                    {isPlusMenuOpen && (
                                        <div
                                            className={`absolute ${
                                                plusMenuPosition === 'top'
                                                    ? 'bottom-[calc(100%+8px)]'
                                                    : 'top-[calc(100%+8px)]'
                                            } left-0 w-[230px] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150 font-sans`}
                                        >
                                            {plusMenuItems.map((item, idx) => (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    onMouseEnter={() => setSelectedPlusIndex(idx)}
                                                    onClick={item.action}
                                                    className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-left text-[12.5px] font-medium text-[#EDEDEF] transition-colors outline-none w-full cursor-pointer ${
                                                        selectedPlusIndex === idx
                                                            ? 'bg-[#252525]'
                                                            : 'hover:bg-[#252525]'
                                                    }`}
                                                >
                                                    {item.icon}
                                                    <span>{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right controls */}
                        <div className="flex items-center gap-1.5">
                            {/* Microphone button — exact match */}
                            <div className="relative group/btn">
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none cursor-pointer"
                                >
                                    <Icons.Microphone className="w-[14px] h-[14px] stroke-[2.5px] relative z-10" />
                                </button>
                                <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                    <span className="text-[12px] font-medium text-[#EDEDEF]">
                                        Record voice prompt
                                    </span>
                                </div>
                            </div>

                            {/* Submit button — exact match */}
                            <div className="relative group/submitbtn">
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!hasInput || chatMutation.isPending}
                                    className={`
                                        flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 outline-none
                                        ${
                                            hasInput && !chatMutation.isPending
                                                ? 'bg-[#D6D5D4] text-black hover:bg-white cursor-pointer'
                                                : 'bg-[#2C2C2E] text-[#4A4A4A] cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {chatMutation.isPending ? (
                                        <div className="w-4 h-4 border-2 border-neutral-500 border-t-neutral-800 rounded-full animate-spin" />
                                    ) : (
                                        <Icons.ArrowRight className="w-4 h-4 stroke-[2px]" />
                                    )}
                                </button>
                                <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 hidden group-hover/submitbtn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                    <span className="text-[12px] font-medium text-[#EDEDEF]">
                                        {!hasInput
                                            ? 'Prompt required'
                                            : chatMutation.isPending
                                              ? 'Generating...'
                                              : 'Enter to send'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
