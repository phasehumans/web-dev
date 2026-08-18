import { useQuery } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { AuthModal } from '@/features/auth/components/AuthModal'
import { profileAPI } from '@/features/profile/api/profile'
import { apiRequest } from '@/shared/api/client'
import { Icons } from '@/shared/components/ui/Icons'

export const DeviceActivate: React.FC = () => {
    const [searchParams] = useSearchParams()
    const [userCode, setUserCode] = useState('')
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    // check if user is logged in
    const {
        data: profile,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        retry: false,
    })

    useEffect(() => {
        const rawCode = searchParams.get('code') || searchParams.get('user_code')
        if (rawCode) {
            let val = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
            if (val.length > 4) {
                val = val.substring(0, 4) + '-' + val.substring(4, 8)
            }
            setUserCode(val)
        }
    }, [searchParams])

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // format as abcd-efgh automatically
        let val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (val.length > 4) {
            val = val.substring(0, 4) + '-' + val.substring(4, 8)
        }
        setUserCode(val)
        setStatus('idle')
        setErrorMessage('')
    }

    const handleVerify = async () => {
        if (userCode.length !== 9) {
            setStatus('error')
            setErrorMessage('Please enter a valid 8-character code')
            return
        }

        if (!profile) {
            setShowAuthModal(true)
            return
        }

        verifyCode()
    }

    const verifyCode = async () => {
        setStatus('verifying')
        try {
            await apiRequest('/auth/device/verify', {
                method: 'POST',
                body: JSON.stringify({ userCode }),
            })

            setStatus('success')
        } catch (err: any) {
            setStatus('error')
            setErrorMessage(
                err.message || 'Verification failed. The code may be invalid or expired.'
            )
        }
    }

    const handleAuthSuccess = async () => {
        setShowAuthModal(false)
        await refetch()
        verifyCode()
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#141414] font-roboto overflow-y-auto">
            <div className="w-full flex items-center justify-center p-6 md:p-10 lg:p-12 relative bg-[#141414]">
                <div className="w-full max-w-[380px] relative z-10 flex flex-col">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-[42px] h-[42px] mb-6">
                                <Icons.DecemberLogo
                                    className="w-full h-full"
                                    stroke="white"
                                    strokeWidth={1}
                                />
                            </div>
                            <h2 className="text-[22px] font-normal text-white tracking-tight mb-2">
                                Device Authorized!
                            </h2>
                            <p className="text-[13px] text-[#A3A3A3]">
                                You can now close this tab and return to your terminal.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-[42px] h-[42px] mb-6">
                                    <Icons.DecemberLogo
                                        className="w-full h-full"
                                        stroke="white"
                                        strokeWidth={1}
                                    />
                                </div>
                                <h2 className="text-[22px] font-normal text-white tracking-tight mb-1">
                                    Activate Device
                                </h2>
                                <p className="text-[13px] text-[#A3A3A3]">
                                    Enter the code displayed on your terminal.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={userCode}
                                    onChange={handleCodeChange}
                                    placeholder="ABCD-EFGH"
                                    className="w-full bg-[#141414] border border-[#2A2A2A] text-white text-center tracking-[0.2em] font-mono h-[48px] rounded-full px-4 text-[16px] outline-none focus:border-[#444444] transition-colors"
                                    maxLength={9}
                                    disabled={status === 'verifying'}
                                />

                                <button
                                    onClick={handleVerify}
                                    disabled={
                                        status === 'verifying' || userCode.length !== 9 || isLoading
                                    }
                                    className={`w-full font-medium h-[42px] rounded-full flex items-center justify-center text-[14px] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-none bg-[#EDEDED] hover:bg-white text-[#111111]`}
                                >
                                    {isLoading
                                        ? 'Checking session...'
                                        : status === 'verifying'
                                          ? 'Verifying...'
                                          : profile
                                            ? 'Authorize as ' + profile.name
                                            : 'Sign in to Authorize'}
                                </button>

                                {status === 'error' && (
                                    <p className="mt-1 text-[13px] text-red-500 px-1 text-center">
                                        {errorMessage}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthSuccess={handleAuthSuccess}
                initialMode="login"
            />
        </div>
    )
}
