import { useQueryClient } from '@tanstack/react-query'
import { Paperclip, KeyRound, Folder } from 'lucide-react'
import React, { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Icons } from './Icons'

import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { useVoiceToText } from '@/shared/lib/useVoiceToText'
import { cn } from '@/shared/lib/utils'

interface PromptFooterProps {
    onUpload: () => void
    onSubmit: () => void
    hasInput: boolean
    isLoading: boolean
    onVoiceTranscript?: (text: string) => void
    onVoiceStateChange?: (isListening: boolean) => void
    isAuthenticated?: boolean
    onOpenAuth?: () => void
    onOptionSelect?: (trigger: string) => void
    mode?: 'agent' | 'search' | 'chat'
    isThinkingMode?: boolean
    onToggleThinking?: (enabled: boolean) => void
}

export const PromptFooter: React.FC<PromptFooterProps> = ({
    onUpload,
    onSubmit,
    hasInput,
    isLoading,
    onVoiceTranscript,
    onVoiceStateChange,
    isAuthenticated,
    onOpenAuth,
    onOptionSelect,
    mode = 'agent',
    isThinkingMode: propThinkingMode,
    onToggleThinking,
}) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)
    const [plusMenuPosition, setPlusMenuPosition] = useState<'top' | 'bottom'>('bottom')
    const [selectedPlusIndex, setSelectedPlusIndex] = useState(0)
    const [internalThinkingMode, setInternalThinkingMode] = useState(false)
    const isThinkingMode = propThinkingMode !== undefined ? propThinkingMode : internalThinkingMode

    const handleToggleThinking = () => {
        const next = !isThinkingMode
        setInternalThinkingMode(next)
        onToggleThinking?.(next)
    }
    const plusRef = useRef<HTMLDivElement>(null)

    const { isListening, isSupported, volume, toggleListening } = useVoiceToText({
        onTranscript: (text) => {
            onVoiceTranscript?.(text)
        },
    })

    useEffect(() => {
        onVoiceStateChange?.(isListening)
    }, [isListening, onVoiceStateChange])

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
        if (onUpload) {
            onUpload()
        }
    }

    const allPlusMenuItems = [
        {
            label: 'Upload attachment',
            icon: <Paperclip className="w-4 h-4 text-[#8F8E8D]" />,
            action: handleUploadClick,
        },
        {
            label: 'Repositories',
            icon: <Icons.Github className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('repos:'),
        },
        {
            label: 'Sessions',
            icon: <Folder className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('sessions:'),
        },
        {
            label: 'Secrets',
            icon: (
                <KeyRound
                    className="w-4 h-4 text-[#8F8E8D]"
                    style={{ transform: 'scaleY(-1) rotate(-135deg)' }}
                />
            ),
            action: () => onOptionSelect?.('secrets:'),
        },
    ]

    const plusMenuItems =
        mode === 'search'
            ? allPlusMenuItems.filter((item) =>
                  ['Upload attachment', 'Repositories'].includes(item.label)
              )
            : mode === 'chat'
              ? allPlusMenuItems.filter(
                    (item) => !['Repositories', 'Sessions'].includes(item.label)
                )
              : allPlusMenuItems

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
                if (!isAuthenticated) {
                    setIsPlusMenuOpen(false)
                    onOpenAuth?.()
                    return
                }
                setIsPlusMenuOpen(false)
                plusMenuItems[selectedPlusIndex]?.action()
            } else if (e.key === 'Escape') {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown, true)
        return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [isPlusMenuOpen, selectedPlusIndex, plusMenuItems, isAuthenticated, onOpenAuth])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (plusRef.current && !plusRef.current.contains(e.target as Node)) {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const { data: overview } = useBillingOverview(Boolean(isAuthenticated))

    return (
        <div className="flex items-center justify-between px-3 pb-3 mt-0 pl-3 relative">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => {
                    // file handling will be implemented here
                    if (e.target.files && e.target.files.length > 0) {
                        console.log('Files selected:', e.target.files)
                    }
                    // reset input so the same file can be selected again
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                    }
                }}
            />
            <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                    <div className="relative group/btn" ref={plusRef}>
                        <button
                            onClick={(e) => {
                                if (mode === 'search') {
                                    handleUploadClick()
                                    return
                                }
                                if (!isPlusMenuOpen) {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const spaceBelow = window.innerHeight - rect.bottom
                                    if (spaceBelow < 250 && rect.top > spaceBelow) {
                                        setPlusMenuPosition('top')
                                    } else {
                                        setPlusMenuPosition('bottom')
                                    }
                                }
                                setIsPlusMenuOpen(!isPlusMenuOpen)
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none cursor-pointer touch-manipulation"
                        >
                            <Icons.Plus className="w-[18px] h-[18px] stroke-[2.5px]" />
                        </button>
                        {!isPlusMenuOpen && (
                            <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                <span className="text-[12px] font-medium text-[#EDEDEF]">
                                    {mode === 'search' ? 'Upload attachment' : 'Attach or mention'}
                                </span>
                            </div>
                        )}

                        {isPlusMenuOpen && mode !== 'search' && (
                            <div
                                className={`absolute ${plusMenuPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} left-0 w-[230px] max-w-[calc(100vw-32px)] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150`}
                            >
                                {plusMenuItems.map((item, idx) => (
                                    <button
                                        key={item.label}
                                        onMouseEnter={() => setSelectedPlusIndex(idx)}
                                        onClick={() => {
                                            setIsPlusMenuOpen(false)
                                            if (!isAuthenticated) {
                                                onOpenAuth?.()
                                                return
                                            }
                                            item.action()
                                        }}
                                        className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-left text-[12.5px] font-medium text-[#EDEDEF] transition-colors outline-none w-full ${selectedPlusIndex === idx ? 'bg-[#252525]' : 'hover:bg-[#252525]'}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {mode !== 'chat' && mode !== 'search' && (
                        <div className="relative group/btn -ml-0.5">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated && onOpenAuth) {
                                        onOpenAuth()
                                        return
                                    }
                                    onOptionSelect?.('repos:')
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none cursor-pointer touch-manipulation"
                            >
                                <Icons.Github className="w-[16px] h-[16px]" />
                            </button>
                            <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                <span className="text-[12px] font-medium text-[#EDEDEF]">
                                    Attach repo
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'search' && (
                    <div className="relative group/btn">
                        <button
                            type="button"
                            onClick={handleToggleThinking}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-200 outline-none cursor-pointer bg-transparent border border-dashed hover:bg-[#27272A] touch-manipulation ${
                                isThinkingMode
                                    ? 'border-[#87B2F4]/30 hover:border-[#87B2F4]/50'
                                    : 'border-white/20 hover:border-white/40'
                            }`}
                        >
                            <span
                                className={`text-[12px] font-medium transition-colors ${
                                    isThinkingMode
                                        ? 'text-[#87B2F4]'
                                        : 'text-[#8E8E8E] hover:text-white'
                                }`}
                            >
                                Thinking
                            </span>
                        </button>
                        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                            <span className="text-[12px] font-medium text-[#EDEDEF]">
                                {isThinkingMode ? 'Thinking mode: On' : 'Thinking mode: Off'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {isSupported && (
                    <div className="relative group/btn">
                        <button
                            type="button"
                            onClick={() => {
                                if (!isAuthenticated) {
                                    onOpenAuth?.()
                                    return
                                }
                                toggleListening()
                            }}
                            className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-full transition-all outline-none touch-manipulation',
                                isListening
                                    ? 'bg-white/10 text-white'
                                    : 'text-[#8E8E8E] hover:bg-white/5 hover:text-white'
                            )}
                        >
                            <Icons.Microphone className="w-[14px] h-[14px] stroke-[2.5px] relative z-10" />
                        </button>
                        <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                            <span className="text-[12px] font-medium text-[#EDEDEF]">
                                {isListening ? 'Stop listening' : 'Record voice prompt'}
                            </span>
                        </div>
                    </div>
                )}
                <div className="relative group/submitbtn">
                    <button
                        onClick={onSubmit}
                        disabled={!hasInput || isLoading}
                        className={`
                            flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 outline-none touch-manipulation
                            ${
                                hasInput && !isLoading
                                    ? 'bg-[#D6D5D4] text-black hover:bg-white'
                                    : 'bg-[#2C2C2E] text-[#4A4A4A] cursor-not-allowed'
                            }
                        `}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-neutral-500 border-t-neutral-800 rounded-full animate-spin" />
                        ) : (
                            <Icons.ArrowRight className="w-4 h-4 stroke-[2px]" />
                        )}
                    </button>
                    <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 hidden group-hover/submitbtn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                            {!hasInput
                                ? 'Prompt required'
                                : isLoading
                                  ? 'Generating...'
                                  : 'Enter to send'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
