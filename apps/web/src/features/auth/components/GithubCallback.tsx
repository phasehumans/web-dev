import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authAPI } from '@/features/auth/api/auth'
import { Icons } from '@/shared/components/ui/Icons'

export const GithubCallback = () => {
    const navigate = useNavigate()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        const isRealPopup = Boolean(
            window.opener && window.opener !== window && !window.opener.closed
        )

        if (error || errorDescription) {
            const message =
                errorDescription || error || 'GitHub authorization was cancelled or failed.'
            if (isRealPopup) {
                try {
                    window.opener.postMessage(
                        { type: 'GITHUB_LOGIN_FAILED', error: message },
                        window.location.origin
                    )
                    window.close()
                } catch {
                    // Intentionally swallowed: fallback handled below
                }
            }
            setStatus('error')
            setErrorMsg(message)
            return
        }

        if (!code) {
            const message = 'No authorization code found in URL.'
            if (isRealPopup) {
                try {
                    window.opener.postMessage(
                        { type: 'GITHUB_LOGIN_FAILED', error: message },
                        window.location.origin
                    )
                    window.close()
                } catch {
                    // Intentionally swallowed: fallback handled below
                }
            }
            setStatus('error')
            setErrorMsg(message)
            return
        }

        let openerHandled = false
        if (isRealPopup) {
            try {
                window.opener.postMessage(
                    { type: 'GITHUB_LOGIN_SUCCESS', code },
                    window.location.origin
                )
                window.close()
                openerHandled = true
            } catch {
                openerHandled = false
            }
        }

        const handleDirectAuth = async () => {
            try {
                setStatus('loading')
                await authAPI.github({ code })
                setStatus('success')
                window.location.href = '/'
            } catch (err: any) {
                setStatus('error')
                setErrorMsg(err?.message || 'Failed to authenticate with GitHub.')
            }
        }

        if (openerHandled) {
            const timer = setTimeout(() => {
                window.location.href = '/'
            }, 500)
            return () => clearTimeout(timer)
        } else {
            handleDirectAuth()
        }
    }, [navigate])

    if (status === 'error') {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#141414] text-white p-4 font-sans">
                <div className="max-w-md w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 text-center shadow-2xl">
                    <h2 className="text-lg font-semibold text-red-400 mb-2">
                        Authentication Failed
                    </h2>
                    <p className="text-sm text-gray-300 bg-red-950/30 border border-red-800/40 rounded-xl p-3 mb-6 text-left">
                        {errorMsg || 'An unknown error occurred during GitHub login.'}
                    </p>
                    <button
                        onClick={() => {
                            window.location.href = '/'
                        }}
                        className="w-full py-2.5 bg-white text-black hover:bg-gray-200 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                    >
                        Back to App
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414]">
            <div className="flex items-center justify-center animate-pulse">
                <Icons.DecemberLogo
                    className="w-10 h-10 md:w-14 md:h-14 text-[#212121]"
                    strokeWidth={1.2}
                />
            </div>
        </div>
    )
}
