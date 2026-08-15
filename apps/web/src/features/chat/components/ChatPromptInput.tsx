import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import React, { useRef, useEffect, useCallback } from 'react'

import type { ChatPromptInputProps } from '@/features/chat/types'

import { PromptFooter } from '@/shared/components/ui/PromptFooter'

export const ChatPromptInput: React.FC<Partial<ChatPromptInputProps> & Record<string, any>> = (
    props
) => {
    const value = props.value ?? props.editPrompt ?? ''
    const onChange = React.useMemo(
        () => props.onChange ?? props.setEditPrompt ?? (() => {}),
        [props.onChange, props.setEditPrompt]
    )
    const onSubmit = props.onSubmit ?? props.handleApplyEdit ?? (() => {})
    const { selectedElement, onClearSelection, isApplyingEdit, isAuthenticated, onOpenAuth } = props

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const voiceBaseRef = useRef('')
    const isVoiceActiveRef = useRef(false)

    const handleVoiceTranscript = useCallback(
        (text: string) => {
            if (!isVoiceActiveRef.current) {
                voiceBaseRef.current = value
                isVoiceActiveRef.current = true
            }
            const base = voiceBaseRef.current
            const separator = base && !base.endsWith(' ') ? ' ' : ''
            onChange(base + separator + text)
        },
        [value, onChange]
    )

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
        <div className="w-full bg-[#141414] shrink-0 z-30">
            <div className="relative group rounded-[17px] bg-[#1F1F1F] border border-[#313131] focus-within:border-white/10 transition-all duration-300 ease-out flex flex-col">
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

                <div className="pt-[12px] pl-5 pr-5 pb-1 min-h-[64px]">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedElement ? 'Describe changes...' : 'Ask December...'}
                        className="w-full bg-transparent text-[#D6D5D4] placeholder-[#949494] caret-white resize-none focus:outline-none z-10 font-sans font-medium leading-relaxed p-0 m-0 border-none text-[14.5px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
                        rows={1}
                    />
                </div>

                <PromptFooter
                    onUpload={() => {}}
                    onSubmit={() => {
                        if (value.trim()) onSubmit()
                    }}
                    hasInput={!!value.trim()}
                    isLoading={!!isApplyingEdit}
                    onVoiceTranscript={handleVoiceTranscript}
                    isAuthenticated={isAuthenticated}
                    onOpenAuth={onOpenAuth}
                    mode="chat"
                    onOptionSelect={(trigger) => {
                        const separator = value && !value.endsWith(' ') ? ' ' : ''
                        onChange((value || '') + separator + '@' + trigger)
                        textareaRef.current?.focus()
                    }}
                />
            </div>
        </div>
    )
}
