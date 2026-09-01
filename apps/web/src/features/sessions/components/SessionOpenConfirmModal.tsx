import React from 'react'

import { Modal } from '@/shared/components/ui/Modal'

interface SessionOpenConfirmModalProps {
    isOpen: boolean
    projectTitle?: string
    activeSessionTitle?: string
    onClose: () => void
    onConfirm: (stopActive?: boolean) => void
}

export const SessionOpenConfirmModal: React.FC<SessionOpenConfirmModalProps> = ({
    isOpen,
    projectTitle,
    activeSessionTitle,
    onClose,
    onConfirm,
}) => {
    const isSwitching = Boolean(activeSessionTitle)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isSwitching ? 'Switch Active Session VM' : 'Open Session'}
            description={
                isSwitching
                    ? 'Another development session VM is currently running.'
                    : 'Open this session in the output workspace.'
            }
            variant="premium"
        >
            <div className="flex flex-col gap-4">
                {isSwitching ? (
                    <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                        Session{' '}
                        <span className="text-amber-400 font-semibold">"{activeSessionTitle}"</span>{' '}
                        is currently active. Would you like to stop it and launch{' '}
                        <span className="text-white font-semibold">"{projectTitle}"</span>?
                    </p>
                ) : (
                    <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                        Are you sure you want to open{' '}
                        <span className="text-white font-semibold">"{projectTitle}"</span>? This
                        will load the session in the workspace and initialize the live preview
                        environment.
                    </p>
                )}
                <div className="flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-all text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(isSwitching)}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-all text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none flex items-center justify-center min-w-[95px]"
                    >
                        {isSwitching ? 'Stop & Switch' : 'Confirm'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
