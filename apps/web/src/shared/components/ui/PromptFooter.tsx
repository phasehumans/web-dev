import { useQuery } from '@tanstack/react-query'
import { Paperclip, KeyRound, Code2, Puzzle, Folder } from 'lucide-react'
import React, { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import sidebarPng from '../../../../public/sidebar.png'

import { Icons } from './Icons'

import { billingAPI } from '@/features/billing/api/billing'
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
}) => {
    const navigate = useNavigate()
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false)
    const [plusMenuPosition, setPlusMenuPosition] = useState<'top' | 'bottom'>('bottom')
    const [selectedPlusIndex, setSelectedPlusIndex] = useState(0)
    const plusRef = useRef<HTMLDivElement>(null)

    const [showCanvasCard, setShowCanvasCard] = useState(false)
    const canvasHideTimeoutRef = useRef<any>(null)

    const handleCanvasMouseEnter = () => {
        if (canvasHideTimeoutRef.current) {
            clearTimeout(canvasHideTimeoutRef.current)
            canvasHideTimeoutRef.current = null
        }
        setShowCanvasCard(true)
    }

    const handleCanvasMouseLeave = () => {
        canvasHideTimeoutRef.current = setTimeout(() => {
            setShowCanvasCard(false)
            canvasHideTimeoutRef.current = null
        }, 300)
    }

    const { isListening, isSupported, volume, toggleListening } = useVoiceToText({
        onTranscript: (text) => {
            onVoiceTranscript?.(text)
        },
    })

    useEffect(() => {
        onVoiceStateChange?.(isListening)
    }, [isListening, onVoiceStateChange])

    useEffect(() => {
        if (!isPlusMenuOpen) {
            setSelectedPlusIndex(0)
            return
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            const menuCount = mode === 'search' ? 3 : 7
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
                const actions =
                    mode === 'search'
                        ? [
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onUpload()
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('repos:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('files:')
                              },
                          ]
                        : [
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onUpload()
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('repos:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('files:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('skills:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('sessions:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('playbooks:')
                              },
                              () => {
                                  setIsPlusMenuOpen(false)
                                  onOptionSelect?.('secrets:')
                              },
                          ]
                actions[selectedPlusIndex]?.()
            } else if (e.key === 'Escape') {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('keydown', handleKeyDown, true)
        return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [
        isPlusMenuOpen,
        selectedPlusIndex,
        onUpload,
        onOptionSelect,
        mode,
        isAuthenticated,
        onOpenAuth,
    ])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (plusRef.current && !plusRef.current.contains(e.target as Node)) {
                setIsPlusMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const { data: overview } = useQuery({
        queryKey: ['billing-overview'],
        queryFn: billingAPI.getOverview,
        staleTime: 10 * 1000,
        enabled: isAuthenticated,
    })

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
            label: 'Codebase files',
            icon: <Code2 className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('files:'),
        },
        {
            label: 'Sessions',
            icon: <Folder className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('sessions:'),
        },
        {
            label: 'Skills',
            icon: <Puzzle className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('skills:'),
        },
        {
            label: 'Secrets',
            icon: <KeyRound className="w-4 h-4 text-[#8F8E8D]" />,
            action: () => onOptionSelect?.('secrets:'),
        },
        {
            label: 'Send secrets',
            icon: (
                <KeyRound
                    className="w-4 h-4 text-[#8F8E8D]"
                    style={{ transform: 'scaleY(-1) rotate(-135deg)' }}
                />
            ),
            action: () => onOptionSelect?.('send-secrets:'),
        },
    ]

    const plusMenuItems =
        mode === 'search'
            ? allPlusMenuItems.filter((item) =>
                  ['Upload attachment', 'Repositories', 'Codebase files'].includes(item.label)
              )
            : mode === 'chat'
              ? allPlusMenuItems.filter(
                    (item) => !['Repositories', 'Codebase files', 'Sessions'].includes(item.label)
                )
              : allPlusMenuItems

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
                            className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none"
                        >
                            <Icons.Plus className="w-[18px] h-[18px] stroke-[2.5px]" />
                        </button>
                        {!isPlusMenuOpen && (
                            <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                <span className="text-[12px] font-medium text-[#EDEDEF]">
                                    Attach or mention
                                </span>
                            </div>
                        )}

                        {isPlusMenuOpen && (
                            <div
                                className={`absolute ${plusMenuPosition === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} left-0 w-[230px] bg-[#1E1E1E] border border-[#2A2928] rounded-2xl p-1 shadow-lg shadow-black/40 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150`}
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

                    {mode !== 'chat' && (
                        <div className="relative group/btn -ml-0.5">
                            <button
                                onClick={() => {
                                    if (!isAuthenticated && onOpenAuth) {
                                        onOpenAuth()
                                        return
                                    }
                                    onOptionSelect?.('repos:')
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full text-[#8E8E8E] transition-all hover:bg-white/5 hover:text-white outline-none"
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

                {mode !== 'search' && (
                    <div
                        className="relative group/btn"
                        onMouseEnter={handleCanvasMouseEnter}
                        onMouseLeave={handleCanvasMouseLeave}
                    >
                        <button
                            onClick={(e) => {
                                if (!isAuthenticated && onOpenAuth) {
                                    onOpenAuth()
                                    return
                                }
                                if (window.innerWidth < 768) {
                                    e.preventDefault()
                                    setShowCanvasCard(!showCanvasCard)
                                    return
                                }
                                window.open('/canvas', '_blank')
                            }}
                            className="flex items-center gap-1.5 text-[#8E8E8E] hover:text-white hover:bg-[#27272A] px-2 py-0.5 rounded-full transition-all duration-200 outline-none cursor-pointer bg-transparent border border-dashed border-white/20 hover:border-white/40"
                        >
                            <span className="text-[12px] font-medium">Canvas</span>
                        </button>
                        {showCanvasCard && (
                            <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 flex flex-col bg-[#1E1E1E] border border-[#2A2928] rounded-2xl shadow-lg shadow-black/40 overflow-hidden w-[260px] animate-in fade-in zoom-in-95 duration-200 cursor-default">
                                <div className="w-full h-[140px] bg-[#1E1E1E] relative overflow-hidden flex items-center justify-center p-1.5 pb-0 pointer-events-none">
                                    <div className="w-full h-full relative overflow-hidden rounded-xl border border-[#2A2928]">
                                        <img
                                            src={sidebarPng}
                                            alt="Context Canvas"
                                            className="w-full h-full object-cover object-center absolute inset-0 opacity-80"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col px-2 pt-2.5 pb-2.5 bg-[#1E1E1E] gap-3">
                                    <div className="flex flex-col px-1 w-full text-left">
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[13px] font-semibold text-[#E8E8E8]">
                                                Introducing Context Canvas
                                            </span>
                                            <span className="px-1.5 py-[1.5px] rounded-full bg-transparent border border-[#3A3938] text-[#A3A3A3] text-[8px] font-bold tracking-widest uppercase leading-none">
                                                Beta
                                            </span>
                                        </div>
                                        <span className="text-[12px] text-[#8F8E8D] mt-1 leading-relaxed">
                                            A freeform visual workspace to express your ideas far
                                            more freely than simple text prompts.
                                        </span>
                                    </div>
                                    <div className="flex justify-end mx-1 mt-1">
                                        <button
                                            className="px-2.5 py-1 bg-[#2B2A29] hover:bg-[#343331] text-[#E8E8E8] text-[11px] font-medium rounded-md transition-colors border border-white/10"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                if (!isAuthenticated && onOpenAuth) {
                                                    onOpenAuth()
                                                    return
                                                }
                                                window.open('/canvas', '_blank')
                                            }}
                                        >
                                            Try now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
                                'flex items-center justify-center w-8 h-8 rounded-full transition-all outline-none',
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
                            flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 outline-none
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
