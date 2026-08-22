import React from 'react'

import { AuthModalGoogleIcon } from './AuthModalGoogleIcon'

import { Icons } from '@/shared/components/ui/Icons'

interface AuthModalGoogleMergeStepProps {
    email: string
    isPending: boolean
    onGoogleLogin: () => void
    onCreatePassword: () => void
    onBack: () => void
}

export const AuthModalGoogleMergeStep: React.FC<AuthModalGoogleMergeStepProps> = ({
    email,
    isPending,
    onGoogleLogin,
    onCreatePassword,
    onBack,
}) => (
    <div className="flex flex-col animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-5 text-white">
                <Icons.DecemberLogo className="w-[42px] h-[42px] text-white" />
            </div>
            <h2 className="text-[22px] font-normal text-white tracking-tight mb-1">
                Google sign-in active
            </h2>
            <p className="text-[13px] text-[#A3A3A3] leading-relaxed">
                This email already uses Google sign-in. Choose how you&apos;d like to continue.
            </p>
        </div>

        <div className="flex flex-col gap-3">
            <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isPending}
                className="w-full bg-[#EDEDED] hover:bg-white text-[#111111] font-medium h-[42px] rounded-full flex items-center justify-center gap-2.5 text-[14px] transition-all duration-200 active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
                <div className="w-[18px] h-[18px] flex items-center justify-center">
                    <AuthModalGoogleIcon />
                </div>
                <span className="text-[14px]">Continue with Google</span>
            </button>

            <button
                type="button"
                onClick={onCreatePassword}
                disabled={isPending}
                className="w-full bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white font-medium h-[42px] rounded-full flex items-center justify-center text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-sm"
            >
                {isPending ? 'Please wait...' : 'Create Password'}
            </button>

            <button
                type="button"
                onClick={onBack}
                disabled={isPending}
                className="self-center mt-4 text-[13px] text-[#888888] hover:text-white transition-colors underline decoration-transparent hover:decoration-white/50 underline-offset-4"
            >
                Back to login
            </button>
        </div>
    </div>
)
