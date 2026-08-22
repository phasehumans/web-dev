import React from 'react'

import type { AuthModalForgotResetStepProps } from '@/features/auth/types'

import { Icons } from '@/shared/components/ui/Icons'

export const AuthModalForgotResetStep: React.FC<AuthModalForgotResetStepProps> = ({
    newPassword,
    confirmPassword,
    errorMessage,
    isPending,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
    onBack,
}) => (
    <div className="flex flex-col">
        <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-5 text-white">
                <Icons.DecemberLogo className="w-[42px] h-[42px] text-white" />
            </div>
            <h2 className="text-[22px] font-normal text-white tracking-tight mb-1">
                Set new password
            </h2>
            <p className="text-[13px] text-[#A3A3A3]">Enter your new password below.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
                type="password"
                required
                placeholder="New password"
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                disabled={isPending}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-full h-[42px] px-4 text-[14px] text-white placeholder-[#666666] outline-none focus:outline-none focus:ring-0 focus:border-[#2A2A2A] focus:shadow-none shadow-none"
            />
            <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                disabled={isPending}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-full h-[42px] px-4 text-[14px] text-white placeholder-[#666666] outline-none focus:outline-none focus:ring-0 focus:border-[#2A2A2A] focus:shadow-none shadow-none"
            />

            {errorMessage && (
                <p className="text-[13px] text-red-500 px-1 text-center">{errorMessage}</p>
            )}

            <button
                type="submit"
                disabled={!newPassword || !confirmPassword || isPending}
                className="w-full bg-[#EDEDED] hover:bg-white text-[#111111] font-medium h-[42px] rounded-full flex items-center justify-center text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-1 shadow-sm"
            >
                {isPending ? 'Please wait...' : 'Set new password'}
            </button>

            <button
                type="button"
                onClick={onBack}
                disabled={isPending}
                className="self-center mt-4 text-[13px] text-[#888888] hover:text-white transition-colors underline decoration-transparent hover:decoration-white/50 underline-offset-4"
            >
                Back
            </button>
        </form>
    </div>
)
