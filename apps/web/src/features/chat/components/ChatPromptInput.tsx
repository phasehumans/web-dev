import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, X, Plus } from 'lucide-react'
import React, { useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ChatPromptInputProps } from '@/features/chat/types'

import { Icons } from '@/shared/components/ui/Icons'
import { useVoiceToText } from '@/shared/lib/useVoiceToText'
import { cn } from '@/shared/lib/utils'

export const ChatPromptInput: React.FC<ChatPromptInputProps> = ({
    value,
    onChange,
    onSubmit,
    isVisualMode,
    onToggleVisualMode,
    selectedElement,
    onClearSelection,
    isApplyingEdit,
}) => {
    const navigate = useNavigate()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const voiceBaseRef = useRef('')
    const isVoiceActiveRef = useRef(false)

    const handleVoiceTranscript = useCallback(
        (text: string) => {
            if (!isVoiceActiveRef.current) {
                voiceBaseRef.current = value || ''
                isVoiceActiveRef.current = true
            }
            const base = voiceBaseRef.current
            const separator = base && !base.endsWith(' ') ? ' ' : ''
            onChange(base + separator + text)
        },
        [value, onChange]
    )

    const { isListening, isSupported, volume, toggleListening } = useVoiceToText({
        onTranscript: handleVoiceTranscript,
    })

    // reset voice base when listening stops
    useEffect(() => {
        if (!isListening) {
            isVoiceActiveRef.current = false
        }
    }, [isListening])

    // auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const scrollHeight = textareaRef.current.scrollHeight
            textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`
            textareaRef.current.style.overflowY = scrollHeight >= 200 ? 'auto' : 'hidden'
        }
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (value.trim()) onSubmit()
        }
    }

    return (
        <div className="w-full bg-[#141414] shrink-0 z-30 flex justify-end">
            <div
                className={cn(
                    'w-full bg-[#1F1F1F] rounded-[17px] border border-[#363534] transition-all relative group flex flex-col'
                )}
            >
                {/* integrated selected element display */}
                <AnimatePresence>
                    {selectedElement && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-b border-[#27272A] bg-white/[0.02]"
                        >
                            <div className="flex items-center gap-2 px-3 py-2">
                                <span className="text-[9px] font-bold bg-white/10 text-white border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {selectedElement.tagName}
                                </span>
                                <span className="text-xs text-neutral-300 truncate max-w-[200px] font-medium">
                                    {selectedElement.textContent}
                                </span>
                                <button
                                    onClick={onClearSelection}
                                    className="ml-auto rounded-full hover:bg-white/10 p-1 text-neutral-400 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selectedElement ? 'Describe changes...' : 'Ask December...'}
                    className="w-full bg-transparent text-[14.5px] text-neutral-200 text-left pl-5 pr-5 py-4 min-h-[78px] max-h-[200px] resize-none outline-none placeholder-neutral-500 font-medium leading-relaxed [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 caret-white"
                    rows={1}
                />

                <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            className="p-1 rounded-full text-[#727272] hover:text-white hover:bg-white/5 transition-all"
                            title="Add attachment"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={onToggleVisualMode}
                            className={cn(
                                'flex items-center px-3 py-1 rounded-full text-[12.5px] font-medium transition-all select-none border border-dashed hidden md:flex',
                                isVisualMode
                                    ? 'bg-white/10 text-white border-neutral-500'
                                    : 'text-[#727272] border-[#363534] hover:text-white hover:border-neutral-500'
                            )}
                        >
                            <span>Visual Edits</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {isSupported && (
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                                    isListening
                                        ? 'bg-white/10 text-white'
                                        : 'text-[#727272] hover:bg-white/5 hover:text-white'
                                )}
                                title={isListening ? 'Stop listening' : 'Voice input'}
                            >
                                <Icons.Microphone className="w-[15px] h-[15px] stroke-[2.5px] relative z-10" />
                            </button>
                        )}
                        <button
                            onClick={onSubmit}
                            className={`
                                flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200
                                ${
                                    value.trim() && !isApplyingEdit
                                        ? 'bg-[#D6D5D4] text-black'
                                        : 'bg-[#2C2C2E] text-[#4A4A4A] cursor-not-allowed'
                                }
                            `}
                        >
                            <ArrowRight size={18} strokeWidth={1.8} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
