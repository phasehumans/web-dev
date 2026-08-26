import { Check, CreditCard } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Modal } from '@/shared/components/ui/Modal'

interface OutOfCreditsModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    description?: string
}

export const OutOfCreditsModal: React.FC<OutOfCreditsModalProps> = ({
    isOpen,
    onClose,
    title = 'Out of Credits',
    description = 'You have used all your credits. Add credits to your account balance or upgrade to continue using December Cloud.',
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
        >
            <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-3 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                        </div>
                        <span className="text-[13px] text-[#D6D5C9]">
                            Pay-as-you-go: Only pay for the tokens you actually use
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                        </div>
                        <span className="text-[13px] text-[#D6D5C9]">
                            Priority execution and full model access
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                        </div>
                        <span className="text-[13px] text-[#D6D5C9]">
                            Top up instantly via UPI QR, Cards, or Crypto
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <button
                        onClick={() => {
                            onClose()
                            navigate('/settings/billing')
                        }}
                        className="w-full py-2.5 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-[#E5E5E5] transition-colors focus:outline-none cursor-pointer flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Add Credits
                    </button>
                    <span className="text-[11px] text-[#7B7A79] text-center">
                        Instant balance activation. Top up anytime.
                    </span>
                </div>
            </div>
        </Modal>
    )
}
