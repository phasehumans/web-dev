import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface OnboardingModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [shouldRenderVideo, setShouldRenderVideo] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setShouldRenderVideo(true)
            }, 400)
            return () => clearTimeout(timer)
        } else {
            setShouldRenderVideo(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div
                className="relative w-full max-w-[520px] bg-[#121211] border border-white/10 rounded-[20px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Video Player Container */}
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
                        <div className="w-full h-full bg-[#181817] flex items-center justify-center text-white/20">
                            <span className="w-6 h-6 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* 2. Text Info */}
                <div className="flex flex-col mt-6 mb-6">
                    <h2 className="text-[17px] font-medium text-white tracking-tight leading-tight mb-2">
                        Introducing December
                    </h2>
                    <p className="text-[12.5px] text-[#8F8E8D] leading-relaxed font-normal">
                        December is a coding agent for terminal and cloud. Give it complex tasks to
                        build, let the autonomous agent handle the execution in a secure cloud
                        sandbox, and inspect diffs, runtime previews, and live terminals seamlessly.
                    </p>
                </div>

                {/* 3. Bottom Footer */}
                <div className="flex items-center justify-end mt-auto">
                    <button
                        onClick={onConfirm}
                        className="text-[12px] font-semibold bg-[#2B2B2B] text-white hover:bg-white/20 active:scale-[0.98] transition-all px-5 py-2.5 rounded-full cursor-pointer"
                    >
                        Try it out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
