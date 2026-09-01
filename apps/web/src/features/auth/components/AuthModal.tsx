import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
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
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] bg-[#141414] flex flex-col items-center justify-center font-roboto overflow-y-auto"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="hidden md:flex items-center justify-center absolute top-5 left-5 text-[#888888] hover:text-[#EDEDED] p-2 rounded-lg hover:bg-white/5 transition-colors z-50 outline-none cursor-pointer"
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={16} strokeWidth={1.75} />
                    </button>
                    <div className="w-full flex items-center justify-center p-6 md:p-10 lg:p-12 relative bg-[#141414]">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="w-full max-w-[380px] relative z-10"
                        >
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
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
