import React from 'react'

import type { AuthModalForgotOtpStepProps } from '@/features/auth/types'

import { Icons } from '@/shared/components/ui/Icons'

export const AuthModalForgotOtpStep: React.FC<AuthModalForgotOtpStepProps> = ({
    email,
    otp,
    errorMessage,
    isPending,
    onChangeOtp,
    onKeyDown,
    onPaste,
    onSubmit,
    onBack,
    setOtpInputRef,
}) => (
    <div className="flex flex-col">
        <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-5 text-white">
                <Icons.DecemberLogo className="w-[42px] h-[42px] text-white" />
            </div>
            <h2 className="text-[22px] font-normal text-white tracking-tight mb-1">
                Enter reset code
            </h2>
            <p className="text-[13px] text-[#A3A3A3]">
                If that email exists, we sent a six-digit code to{' '}
                <span className="text-[#f5f5f5] font-medium">{email}</span>.
            </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2.5 justify-center mb-2">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(element) => setOtpInputRef(index, element)}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => onChangeOtp(index, event.target.value)}
                        onKeyDown={(event) => onKeyDown(index, event)}
                        onPaste={index === 0 ? onPaste : undefined}
                        disabled={isPending}
                        className="w-[50px] h-[52px] text-center text-[20px] font-semibold bg-[#141414] border border-[#2A2A2A] rounded-2xl text-white caret-white outline-none focus:outline-none focus:ring-0 focus:border-[#2A2A2A] focus:shadow-none shadow-none"
                    />
                ))}
            </div>

            {errorMessage && (
                <p className="text-[13px] text-red-500 px-1 text-center">{errorMessage}</p>
            )}

            <button
                type="submit"
                disabled={otp.some((digit) => !digit) || isPending}
                className="w-full bg-[#EDEDED] hover:bg-white text-[#111111] font-medium h-[42px] rounded-full flex items-center justify-center text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-1 shadow-sm"
            >
                {isPending ? 'Please wait...' : 'Verify & Continue'}
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
