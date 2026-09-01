import React, { useState } from 'react'

import type { SessionDeleteModalProps } from '@/features/sessions/types'

import { Modal } from '@/shared/components/ui/Modal'

export const SessionDeleteModal: React.FC<SessionDeleteModalProps> = ({
    isOpen,
    projectTitle,
    isPending,
    onClose,
    onConfirm,
}) => {
    const [isDeleting, setIsDeleting] = useState(false)
    const isDisabled = isPending || isDeleting

    const handleConfirm = () => {
        if (isDisabled) return
        setIsDeleting(true)
        setTimeout(() => {
            setIsDeleting(false)
            onConfirm()
        }, 800)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Delete project"
            description="Permanently delete this project from your workspace."
            variant="premium"
        >
            <div className="flex flex-col gap-4">
                <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                    Are you sure you want to delete{' '}
                    <span className="text-white font-semibold">"{projectTitle}"</span>? This action
                    is permanent and cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDisabled}
                        className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isDisabled}
                        className="bg-[#EF4444] text-white hover:bg-red-600 active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50 flex items-center justify-center min-w-[95px]"
                    >
                        {isDeleting ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Deleting...</span>
                            </div>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
