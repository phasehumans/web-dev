import React from 'react'
import { createPortal } from 'react-dom'

interface BigModalProps {
    title: string
    icon: React.ReactNode
    onClose: () => void
    children: React.ReactNode
}

export const BigModalOverlay: React.FC<BigModalProps> = ({ onClose, children }) => {
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/40 backdrop-blur-none animate-in fade-in duration-200">
            <div className="absolute inset-0" />
            <div className="relative w-full max-w-[1000px] h-[90vh] md:h-[86vh] bg-[#141414] rounded-3xl border border-[#242323] flex overflow-hidden shadow-2xl text-left">
                {children}
            </div>
        </div>,
        document.body
    )
}

export const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7B7A79] mb-1.5 select-none">
        {children}
    </label>
)

export const PremiumInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
    className = '',
    ...props
}) => (
    <input
        {...props}
        className={`w-full bg-[#1A1918] border border-[#2B2A29] rounded-xl px-3.5 py-2 text-[13px] text-[#D6D5C9] placeholder-[#555453] outline-none focus:border-[#4A4948] transition-colors ${className}`}
    />
)

export const PremiumTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
    className = '',
    ...props
}) => (
    <textarea
        {...props}
        className={`w-full bg-[#1A1918] border border-[#2B2A29] rounded-xl px-3.5 py-2.5 text-[13px] text-[#D6D5C9] placeholder-[#555453] outline-none focus:border-[#4A4948] transition-colors resize-none ${className}`}
    />
)

export const PremiumToggle: React.FC<{ active: boolean; onChange: () => void }> = ({
    active,
    onChange,
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none outline-none ${
            active ? 'bg-[#242323]' : 'bg-[#100E12] border-[#383736]'
        }`}
    >
        <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                active ? 'translate-x-4 bg-[#D6D5C9]' : 'translate-x-0 bg-[#383736]'
            }`}
        />
    </button>
)
