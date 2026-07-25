import React, { useState, useEffect } from 'react'

import { Icons } from '@/shared/components/ui/Icons'
import { Modal } from '@/shared/components/ui/Modal'

interface SessionTagsModalProps {
    isOpen: boolean
    session: any | null
    isPending: boolean
    onClose: () => void
    onSave: (tags: string[]) => void
}

export const SessionTagsModal: React.FC<SessionTagsModalProps> = ({
    isOpen,
    session,
    isPending,
    onClose,
    onSave,
}) => {
    const [tagInput, setTagInput] = useState<string>('')

    useEffect(() => {
        if (isOpen && session) {
            setTagInput(session.tags?.[0] || '')
        }
    }, [session, isOpen])

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault()
        if (isPending) return
        const trimmed = tagInput.trim()
        onSave(trimmed ? [trimmed] : [])
    }

    const handleClear = () => {
        setTagInput('')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Session Tag"
            description="Add, edit, or remove the tag for this session."
            variant="premium"
        >
            <form onSubmit={handleSave} className="flex flex-col gap-4">
                <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                    Assign a custom tag to{' '}
                    <span className="font-semibold text-white">
                        "{session?.title || 'this session'}"
                    </span>{' '}
                    for quick identification and categorization.
                </p>

                <div className="relative flex items-center">
                    <input
                        id="session-tag-input"
                        type="text"
                        autoFocus
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value.slice(0, 30))}
                        className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg pl-3.5 pr-9 py-2.5 text-white text-[13px] focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948]"
                        placeholder="Enter tag name (e.g. React, CLI, AI)..."
                        disabled={isPending}
                    />
                    {tagInput.trim() ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-2.5 p-1 rounded-md text-[#7B7A79] hover:text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                            title="Clear tag"
                        >
                            <Icons.X className="w-3.5 h-3.5" />
                        </button>
                    ) : null}
                </div>

                <div className="mt-2 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-all text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all text-[13px] font-medium px-5 py-2 rounded-lg focus:outline-none disabled:opacity-40 flex items-center justify-center min-w-[85px]"
                    >
                        {isPending ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Saving...</span>
                            </div>
                        ) : (
                            'Save'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
