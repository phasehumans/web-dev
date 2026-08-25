import { Check } from 'lucide-react'
import React, { useState } from 'react'

import { profileAPI } from '@/features/profile/api/profile'
import { Modal } from '@/shared/components/ui/Modal'
import { cn } from '@/shared/lib/utils'

export interface BadSessionModalProps {
    isOpen: boolean
    onClose: () => void
    sessionId?: string | null
    projectName?: string | null
    onSubmitFeedback?: (data: { reasons: string[]; details: string }) => void
}

const FEEDBACK_REASONS = ['Incorrect code', 'Did not follow instructions', 'Incomplete', 'Other']

export const BadSessionModal: React.FC<BadSessionModalProps> = ({
    isOpen,
    onClose,
    sessionId,
    projectName,
    onSubmitFeedback,
}) => {
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    const [details, setDetails] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showThankYou, setShowThankYou] = useState(false)

    const detailsRef = React.useRef<HTMLTextAreaElement | null>(null)

    if (!isOpen) return null

    const toggleReason = (reason: string) => {
        setSelectedReasons((prev) =>
            prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
        )
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const formTextarea = form.querySelector('textarea')
        const currentDetails = details || formTextarea?.value || detailsRef.current?.value || ''

        if (selectedReasons.length === 0 && !currentDetails.trim()) return

        setIsSubmitting(true)
        try {
            const feedbackParts: string[] = []
            if (selectedReasons.length > 0) {
                feedbackParts.push(`Reasons: ${selectedReasons.join(', ')}`)
            }
            if (currentDetails.trim()) {
                feedbackParts.push(`Details: ${currentDetails.trim()}`)
            }
            if (sessionId) {
                feedbackParts.push(`Session: ${sessionId}`)
            }
            if (projectName) {
                feedbackParts.push(`Project: ${projectName}`)
            }

            await profileAPI.submitFeedback({
                rating: 'sad',
                feedback: feedbackParts.join('\n'),
            })

            onSubmitFeedback?.({ reasons: selectedReasons, details: currentDetails })
            setShowThankYou(true)

            setTimeout(() => {
                onClose()
                setTimeout(() => {
                    setSelectedReasons([])
                    setDetails('')
                    setShowThankYou(false)
                }, 200)
            }, 1800)
        } catch (error) {
            console.error('Failed to submit session feedback:', error)
            onSubmitFeedback?.({ reasons: selectedReasons, details: currentDetails })
            setShowThankYou(true)

            setTimeout(() => {
                onClose()
                setTimeout(() => {
                    setSelectedReasons([])
                    setDetails('')
                    setShowThankYou(false)
                }, 200)
            }, 1800)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            onClose()
            setTimeout(() => {
                setSelectedReasons([])
                setDetails('')
                setShowThankYou(false)
            }, 200)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={showThankYou ? 'Thank you!' : 'Bad session'}
            description={
                showThankYou
                    ? 'Your feedback helps us make December better for everyone.'
                    : 'Give feedback on this session to help improve December.'
            }
            variant="premium"
            maxWidth="max-w-[440px]"
        >
            {showThankYou ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#D6D5C9] mb-3 shadow-lg shadow-black/20">
                        <Check className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                    </div>
                    <p className="text-[13px] text-[#8F8E8D] leading-relaxed">
                        We appreciate you taking the time to share your feedback.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Reason Pills */}
                    <div className="flex flex-wrap gap-1.5">
                        {FEEDBACK_REASONS.map((reason) => {
                            const isSelected = selectedReasons.includes(reason)
                            return (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => toggleReason(reason)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-[transform,background-color,border-color,color] duration-150 outline-none cursor-pointer border active:scale-95 select-none',
                                        isSelected
                                            ? 'bg-white text-black border-white shadow-sm'
                                            : 'bg-white/[0.03] text-[#8F8E8D] hover:text-white border-[#2B2A27] hover:border-[#383736]'
                                    )}
                                >
                                    {reason}
                                </button>
                            )
                        })}
                    </div>

                    {/* Details Textarea */}
                    <div>
                        <textarea
                            ref={detailsRef}
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            onInput={(e: any) => setDetails(e.target.value)}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] hover:border-[#383736] focus:border-[#4B4A47] rounded-lg p-3 text-[13px] text-white outline-none resize-none h-[100px] transition-[border-color,box-shadow] duration-200 placeholder:text-[#4A4948] chat-scrollbar"
                            placeholder="Add more details... (Optional but highly appreciated!)"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Actions */}
                    <div className="mt-1 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="bg-transparent text-white hover:bg-white/5 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={
                                isSubmitting || (selectedReasons.length === 0 && !details.trim())
                            }
                            className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[90px] cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-1.5 justify-center">
                                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    <span>Submitting...</span>
                                </div>
                            ) : (
                                'Submit'
                            )}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
