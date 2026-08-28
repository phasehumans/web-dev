import React from 'react'
import { useNavigate } from 'react-router-dom'

import sidebarPng from '../../../../assets/sidebar.png'

import { Modal } from '@/shared/components/ui/Modal'

interface OutOfCreditsModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    description?: string
    bannerImage?: string
}

export const OutOfCreditsModal: React.FC<OutOfCreditsModalProps> = ({
    isOpen,
    onClose,
    title = 'Out of Credits',
    description = "You don't have enough credits to continue. Add credits to your wallet to keep using December Cloud.",
    bannerImage,
}) => {
    const navigate = useNavigate()

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            variant="premium"
            showLogo={false}
            banner={
                <div className="w-full h-[180px] relative overflow-hidden">
                    <img
                        src={bannerImage || sidebarPng}
                        alt={title}
                        decoding="async"
                        className="w-full h-full object-cover object-center absolute inset-0"
                    />
                </div>
            }
        >
            <div className="flex flex-col gap-2.5 mt-5">
                <button
                    type="button"
                    onClick={() => {
                        onClose()
                        navigate('/settings/billing')
                    }}
                    className="w-full h-9 rounded-lg bg-white hover:bg-[#EDEDED] text-black text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center outline-none"
                >
                    Add Credits
                </button>
                <span className="text-[11px] text-[#7B7A79] text-center">
                    Instant wallet activation · Top up anytime
                </span>
            </div>
        </Modal>
    )
}
