import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

import type { SessionShareModalProps } from '@/features/sessions/types'

import { Modal } from '@/shared/components/ui/Modal'

const CATEGORIES = [
    { id: 'NONE', label: 'Select a category...' },
    { id: 'SAAS_APP', label: 'Apps & Games' },
    { id: 'LANDING_PAGE', label: 'Landing Pages' },
    { id: 'DASHBOARD', label: 'Dashboards' },
    { id: 'PORTFOLIO_BLOG', label: 'Components' },
    { id: 'ECOMMERCE', label: 'E-commerce' },
]

export const SessionShareModal: React.FC<SessionShareModalProps> = ({
    isOpen,
    projectTitle,
    isSharedAsTemplate,
    isPending,
    onClose,
    onConfirm,
}) => {
    const displayTitle = projectTitle?.trim() ? `"${projectTitle}"` : 'this project'
    const [isProcessing, setIsProcessing] = useState(false)
    const [category, setCategory] = useState('NONE')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const isDisabled = isPending || isProcessing
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        if (isDisabled) return
        setIsProcessing(true)
        setTimeout(() => {
            setIsProcessing(false)
            onConfirm(category !== 'NONE' ? category : undefined)
        }, 800)
    }

    const selectedCategoryLabel =
        CATEGORIES.find((cat) => cat.id === category)?.label ?? 'Select a category...'

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isSharedAsTemplate ? 'Unshare template' : 'Share as template'}
            description={
                isSharedAsTemplate
                    ? 'Remove this project from the Community Templates page.'
                    : 'Share this project in the Community Templates page.'
            }
            variant="premium"
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-[#8F8E8D]">
                    {isSharedAsTemplate ? (
                        <>
                            This will remove{' '}
                            <span className="font-medium text-white">{displayTitle}</span> from the
                            Community Templates page. Other users will no longer be able to discover
                            and remix it.
                        </>
                    ) : (
                        <>
                            This will share{' '}
                            <span className="font-medium text-white">{displayTitle}</span> in the
                            Community Templates page so other users can discover and remix it.
                        </>
                    )}
                </p>

                {!isSharedAsTemplate && (
                    <div className="mt-1 relative" ref={dropdownRef}>
                        <label className="text-[13px] text-[#8F8E8D] mb-2 block leading-relaxed">
                            Template Category
                        </label>
                        <button
                            type="button"
                            onClick={() => !isDisabled && setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isDisabled}
                            className="w-full flex items-center justify-between bg-transparent hover:bg-[#191919] border border-[#2B2A27] hover:border-[#383736] rounded-lg px-3.5 py-2.5 text-white text-[13px] transition-[border-color,background-color] duration-200 focus:outline-none disabled:opacity-50 text-left"
                        >
                            <span className={category === 'NONE' ? 'text-[#7B7A79]' : 'text-white'}>
                                {selectedCategoryLabel}
                            </span>
                            <ChevronDown
                                className={`w-4 h-4 text-[#7B7A79] transition-transform duration-200 ${
                                    isDropdownOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-[#383736] bg-[#1F1F1F] py-2 shadow-2xl z-50 max-h-[220px] overflow-y-auto no-scrollbar"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setCategory(cat.id)
                                                setIsDropdownOpen(false)
                                            }}
                                            className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] text-[#D6D5C9] hover:bg-[#242323] hover:text-white transition-colors text-left"
                                        >
                                            <span
                                                className={
                                                    cat.id === 'NONE' ? 'text-[#7B7A79]' : ''
                                                }
                                            >
                                                {cat.label}
                                            </span>
                                            {category === cat.id && (
                                                <Check className="h-3.5 w-3.5 text-[#D6D5C9]" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

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
                        disabled={isDisabled}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-medium px-4 py-2 rounded-lg focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[145px]"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>{isSharedAsTemplate ? 'Unsharing...' : 'Sharing...'}</span>
                            </div>
                        ) : isSharedAsTemplate ? (
                            'Unshare template'
                        ) : (
                            'Share as template'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
