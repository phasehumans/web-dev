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
} from 'lucide-react'
import React, { useState } from 'react'

import { ChatPromptInput } from '@/features/chat/components/ChatPromptInput'
import { cn } from '@/shared/lib/utils'

interface SearchSpaceScreenProps {
    onBack?: () => void
    initialPrompt?: string
}

interface SearchMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp?: string
}

export const SearchSpaceScreen: React.FC<SearchSpaceScreenProps> = ({
    onBack,
    initialPrompt = 'what is the date today',
}) => {
    const [promptText, setPromptText] = useState('')
    const [messages, setMessages] = useState<SearchMessage[]>([
        {
            id: '1',
            role: 'user',
            content: initialPrompt,
        },
        {
            id: '2',
            role: 'assistant',
            content: `Today's date is ${new Date().toISOString().split('T')[0]}.`,
        },
    ])
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | null>>({})

    const handleCopy = (id: string, text: string) => {
        void navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleSendPrompt = () => {
        if (!promptText.trim()) return
        const userMsg: SearchMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: promptText.trim(),
        }

        const replyMsg: SearchMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I searched for "${promptText.trim()}". Here are the relevant findings from your code and documentation.`,
        }

        setMessages((prev) => [...prev, userMsg, replyMsg])
        setPromptText('')
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] text-[#EDEDEF] relative overflow-hidden min-h-0 font-sans">
            {/* Top Header */}
            <div className="h-11 flex items-center justify-between px-4 bg-[#141414] border-b border-[#222225] shrink-0 z-30 select-none">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="p-1 text-[#8E8D8C] hover:text-white rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                            title="Back"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <SearchIcon size={14} className="text-[#87B2F4]" />
                        <span className="text-xs font-normal text-[#D6D5D4] lowercase hover:bg-[#222225] hover:text-white px-2 py-1 rounded-md transition-colors cursor-pointer">
                            {initialPrompt.toLowerCase()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-[#2C2C30]">
                    <div className="max-w-xl mx-auto w-full space-y-6">
                        {messages.map((msg) => {
                            if (msg.role === 'user') {
                                return (
                                    <div key={msg.id} className="flex flex-col items-end w-full">
                                        <div className="bg-[#1C1C1E] px-4 py-2 rounded-2xl text-xs text-[#EDEDED] max-w-[85%] break-words">
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
                                    <div className="text-sm text-[#EDEDEF] leading-relaxed whitespace-pre-wrap">
                                        {msg.content}
                                    </div>

                                    {/* Action Buttons */}
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
                                                    ? 'text-white'
                                                    : 'text-[#8E8D8C] hover:text-white'
                                            )}
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
                                                    ? 'text-white'
                                                    : 'text-[#8E8D8C] hover:text-white'
                                            )}
                                        >
                                            <ThumbsDown size={13} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleCopy(msg.id, msg.content)}
                                            className="p-1.5 text-[#8E8D8C] hover:text-white rounded-md transition-colors cursor-pointer"
                                        >
                                            {copiedId === msg.id ? (
                                                <Check size={13} className="text-emerald-500" />
                                            ) : (
                                                <Copy size={13} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Bottom Prompt Input */}
                <div className="shrink-0 bg-[#141414] p-4">
                    <div className="max-w-xl mx-auto w-full">
                        <ChatPromptInput
                            value={promptText}
                            onChange={setPromptText}
                            onSubmit={handleSendPrompt}
                            isGenerating={false}
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
