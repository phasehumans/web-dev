import React from 'react'
import { createPortal } from 'react-dom'

interface OnboardingModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [shouldRenderVideo, setShouldRenderVideo] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setShouldRenderVideo(true)
            }, 500)
            return () => clearTimeout(timer)
        } else {
            setShouldRenderVideo(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-none pointer-events-auto animate-in fade-in duration-300">
            <div className="absolute inset-0" />
            <div
                className="relative w-full max-w-[520px] bg-[#121211] border border-white/5 rounded-[20px] shadow-lg shadow-black/40 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. video player container */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 relative bg-black shadow-inner flex items-center justify-center">
                    {shouldRenderVideo ? (
                        <iframe
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                            title="Introducing December"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <div className="w-full h-full bg-transparent flex items-center justify-center text-white/10">
                            <span className="w-6 h-6 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* 2. text info */}
                <div className="flex flex-col mt-6 mb-6">
                    <h2 className="text-[17px] font-semibold text-white tracking-tight leading-tight mb-2">
                        Introducing December
                    </h2>
                    <p className="text-[12.5px] text-[#8F8E8D] leading-relaxed font-normal">
                        December is a full-stack, agentic AI coding assistant. Give it complex tasks
                        to build, let the autonomous agent handle the execution in a secure cloud
                        sandbox, and collaborate seamlessly on the interactive Canvas.
                    </p>
                </div>

                {/* 3. bottom footer */}
                <div className="flex items-center justify-end mt-auto">
                    <button
                        onClick={onConfirm}
                        className="text-[12px] font-semibold bg-[#2B2B2B] text-white transition-all duration-200 active:scale-[0.98] px-5 py-2 rounded-full"
                    >
                        Try it out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
