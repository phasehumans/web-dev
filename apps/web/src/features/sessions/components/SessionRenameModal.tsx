import React, { useState } from 'react'

import type { SessionRenameModalProps } from '@/features/sessions/types'

import { Modal } from '@/shared/components/ui/Modal'

export const SessionRenameModal: React.FC<SessionRenameModalProps> = ({
    isOpen,
    value,
    isPending,
    onClose,
    onChange,
    onSubmit,
}) => {
    const [isSaving, setIsSaving] = useState(false)
    const isDisabled = isPending || isSaving

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        if (!value.trim() || isDisabled) return
        setIsSaving(true)
        setTimeout(() => {
            setIsSaving(false)
            onSubmit(event)
        }, 800)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Rename project"
            description="Update how this project appears in your workspace."
            variant="premium"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                    Enter a new title for{' '}
                    <span className="font-semibold text-white">"{value || 'this session'}"</span> to
                    update how it appears across your workspace.
                </p>

                <div>
                    <input
                        id="project-rename-input"
                        type="text"
                        autoFocus
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-lg px-3.5 py-2.5 text-white text-[13px] focus:outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948]"
                        placeholder="Enter project name..."
                        disabled={isDisabled}
                    />
                </div>

                <div className="mt-1 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDisabled}
                        className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!value.trim() || isDisabled}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[85px]"
                    >
                        {isSaving ? (
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
