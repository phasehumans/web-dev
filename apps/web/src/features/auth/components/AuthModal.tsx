import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import React from 'react'

import { useAuthModalController } from '../hooks/useAuthModalController'

import { AuthModalAuthStep } from './AuthModalAuthStep'
import { AuthModalForgotEmailStep } from './AuthModalForgotEmailStep'
import { AuthModalForgotOtpStep } from './AuthModalForgotOtpStep'
import { AuthModalForgotResetStep } from './AuthModalForgotResetStep'
import { AuthModalGoogleMergeStep } from './AuthModalGoogleMergeStep'
import { AuthModalOtpStep } from './AuthModalOtpStep'

import type { AuthModalProps } from '@/features/auth/types'

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    onClose,
    initialMode = 'login',
    onAuthSuccess,
}) => {
    const {
        authMode,
        step,
        email,
        setEmail,
        password,
        setPassword,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        otp,
        errorMessage,
        googleLogin,
        githubLogin,
        isAuthPending,
        isGooglePending,
        isGithubPending,
        isOtpPending,
        isForgotEmailPending,
        isForgotOtpPending,
        isForgotResetPending,
        handleAuthSubmit,
        handleOtpChange,
        handleOtpKeyDown,
        handleOtpPaste,
        handleOtpSubmit,
        handleForgotPasswordStart,
        handleForgotEmailSubmit,
        handleForgotOtpSubmit,
        handleForgotResetSubmit,
        handleToggleAuthMode,
        handleBackToAuth,
        handleBackToForgotEmail,
        handleBackToForgotOtp,
        setOtpInputRef,
        handleCreatePassword,
    } = useAuthModalController({
        isOpen,
        initialMode: initialMode as any,
        onAuthSuccess,
        onClose,
    })

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed inset-0 z-[100] bg-[#141414] flex flex-col items-center justify-center font-roboto overflow-y-auto"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 left-4 md:top-8 md:left-8 text-[#888888] hover:text-white transition-colors z-50 outline-none"
                    >
                        <span className="hidden md:flex items-center gap-1 text-[14px] font-medium">
                            <ChevronLeft size={16} strokeWidth={2.5} /> Back
                        </span>
                        <span className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <X size={18} strokeWidth={2} />
                        </span>
                    </button>
                    <div className="w-full flex items-center justify-center p-6 md:p-10 lg:p-12 relative bg-[#141414]">
                        <div className="w-full max-w-[380px] relative z-10">
                            {step === 'auth' ? (
                                <AuthModalAuthStep
                                    authMode={authMode}
                                    email={email}
                                    password={password}
                                    errorMessage={errorMessage}
                                    isAuthPending={isAuthPending}
                                    isGooglePending={isGooglePending}
                                    isGithubPending={isGithubPending}
                                    onEmailChange={setEmail}
                                    onPasswordChange={setPassword}
                                    onGoogleLogin={googleLogin}
                                    onGithubLogin={githubLogin}
                                    onSubmit={handleAuthSubmit}
                                    onToggleAuthMode={handleToggleAuthMode}
                                    onForgotPassword={handleForgotPasswordStart}
                                    onClose={onClose}
                                />
                            ) : step === 'google-merge' ? (
                                <AuthModalGoogleMergeStep
                                    email={email}
                                    isPending={isForgotEmailPending}
                                    onGoogleLogin={googleLogin}
                                    onCreatePassword={handleCreatePassword}
                                    onBack={handleBackToAuth}
                                />
                            ) : step === 'otp' ? (
                                <AuthModalOtpStep
                                    email={email}
                                    otp={otp}
                                    errorMessage={errorMessage}
                                    isPending={isOtpPending}
                                    onChangeOtp={handleOtpChange}
                                    onKeyDown={handleOtpKeyDown}
                                    onPaste={handleOtpPaste}
                                    onSubmit={handleOtpSubmit}
                                    onBack={handleBackToAuth}
                                    setOtpInputRef={setOtpInputRef}
                                />
                            ) : step === 'forgot-email' ? (
                                <AuthModalForgotEmailStep
                                    email={email}
                                    errorMessage={errorMessage}
                                    isPending={isForgotEmailPending}
                                    onEmailChange={setEmail}
                                    onSubmit={handleForgotEmailSubmit}
                                    onBack={handleBackToAuth}
                                />
                            ) : step === 'forgot-otp' ? (
                                <AuthModalForgotOtpStep
                                    email={email}
                                    otp={otp}
                                    errorMessage={errorMessage}
                                    isPending={isForgotOtpPending}
                                    onChangeOtp={handleOtpChange}
                                    onKeyDown={handleOtpKeyDown}
                                    onPaste={handleOtpPaste}
                                    onSubmit={handleForgotOtpSubmit}
                                    onBack={handleBackToForgotEmail}
                                    setOtpInputRef={setOtpInputRef}
                                />
                            ) : (
                                <AuthModalForgotResetStep
                                    newPassword={newPassword}
                                    confirmPassword={confirmPassword}
                                    errorMessage={errorMessage}
                                    isPending={isForgotResetPending}
                                    onNewPasswordChange={setNewPassword}
                                    onConfirmPasswordChange={setConfirmPassword}
                                    onSubmit={handleForgotResetSubmit}
                                    onBack={handleBackToForgotOtp}
                                />
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
