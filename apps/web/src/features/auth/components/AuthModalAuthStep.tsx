import { Eye, EyeOff } from 'lucide-react'
import React from 'react'

import { AuthModalGithubIcon } from './AuthModalGithubIcon'
import { AuthModalGoogleIcon } from './AuthModalGoogleIcon'

import type { AuthModalAuthStepProps } from '@/features/auth/types'

import { Icons } from '@/shared/components/ui/Icons'

export const AuthModalAuthStep: React.FC<AuthModalAuthStepProps> = ({
    authMode,
    email,
    password,
    errorMessage,
    isAuthPending,
    isGooglePending,
    isGithubPending,
    onEmailChange,
    onPasswordChange,
    onGoogleLogin,
    onGithubLogin,
    onSubmit,
    onToggleAuthMode,
    onForgotPassword,
    onClose,
}) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isFormFilled = email.trim().length > 0 && password.length > 0

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-5 opacity-90 hover:opacity-100 transition-opacity text-[#D6D5D4]">
                    <Icons.DecemberLogo className="w-[42px] h-[42px]" />
                </div>
                <h2 className="text-[22px] font-normal text-white tracking-tight mb-1">
                    {authMode === 'login' ? 'Sign in to continue building' : 'Create an account'}
                </h2>
                <p className="text-[13px] text-gray-400 tracking-wider">turn ideas into reality.</p>
            </div>

            <div className="flex flex-col gap-2.5 mb-1">
                <button
                    type="button"
                    onClick={onGithubLogin}
                    disabled={isAuthPending}
                    className="w-full bg-[#222222] hover:bg-[#2A2A2A] text-white font-medium h-[42px] rounded-full flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] shadow-none disabled:opacity-50 border border-[#333333]"
                >
                    <div className="w-[18px] h-[18px] flex items-center justify-center">
                        <AuthModalGithubIcon />
                    </div>
                    <span className="text-[14px]">Continue with GitHub</span>
                </button>

                <button
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={isAuthPending}
                    className="w-full bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium h-[42px] rounded-full flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] shadow-none disabled:opacity-50"
                >
                    <div className="w-[18px] h-[18px] flex items-center justify-center">
                        <AuthModalGoogleIcon />
                    </div>
                    <span className="text-[14px]">Continue with Google</span>
                </button>
            </div>

            <div className="flex items-center my-5">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-3 text-[10px] text-[#888888] font-semibold uppercase tracking-widest">
                    or continue with email
                </span>
                <div className="flex-1 border-t border-white/10"></div>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    disabled={isAuthPending}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-full h-[42px] px-4 text-[14px] text-white placeholder-[#666666] outline-none focus:outline-none focus:ring-0 focus:border-[#2A2A2A] focus:shadow-none shadow-none"
                />

                <div className="relative w-full">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Password"
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        disabled={isAuthPending}
                        className="w-full bg-[#141414] border border-[#2A2A2A] rounded-full h-[42px] pl-4 pr-11 text-[14px] text-white placeholder-[#666666] outline-none focus:outline-none focus:ring-0 focus:border-[#2A2A2A] focus:shadow-none shadow-none"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#EDEDED] transition-colors p-1.5 rounded-full hover:bg-white/5"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>

                {authMode === 'login' && (
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        disabled={isAuthPending}
                        className="self-end text-[13px] text-[#A3A3A3] hover:text-white transition-colors underline decoration-transparent hover:decoration-white/50 underline-offset-2 pr-1"
                    >
                        Forgot password?
                    </button>
                )}

                {errorMessage && (
                    <p className="text-[13px] text-red-500 px-1 text-center">{errorMessage}</p>
                )}

                <button
                    type="submit"
                    disabled={isAuthPending}
                    className={`w-full font-medium h-[42px] rounded-full flex items-center justify-center text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-1 shadow-sm ${
                        isFormFilled
                            ? 'bg-[#EDEDED] hover:bg-white text-[#111111]'
                            : 'bg-[#222222] hover:bg-transparent text-[#888888]'
                    }`}
                >
                    {isAuthPending
                        ? 'Please wait...'
                        : authMode === 'login'
                          ? 'Continue with email'
                          : 'Sign up with email'}
                </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-4 text-center">
                <button
                    type="button"
                    onClick={onToggleAuthMode}
                    className="text-[13px] text-[#888888] hover:text-white transition-colors"
                >
                    {authMode === 'login' ? (
                        <span>
                            Don't have an account?{' '}
                            <span className="text-[#EDEDED] underline underline-offset-4 hover:text-white font-medium">
                                Sign up
                            </span>
                        </span>
                    ) : (
                        <span>
                            Already have an account?{' '}
                            <span className="text-[#EDEDED] underline underline-offset-4 hover:text-white font-medium">
                                Log in
                            </span>
                        </span>
                    )}
                </button>

                <p className="text-[11.5px] text-[#707070] leading-tight max-w-[320px]">
                    By continuing, you agree to December&apos;s{' '}
                    <a
                        href="/docs/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9E9E9E] hover:text-white underline underline-offset-2"
                    >
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                        href="/docs/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#9E9E9E] hover:text-white underline underline-offset-2"
                    >
                        Privacy Policy
                    </a>
                    .
                </p>
            </div>
        </div>
    )
}
