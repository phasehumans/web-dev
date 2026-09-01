import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import React, { useState } from 'react'

import { billingAPI } from '@/features/billing/api/billing'
import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { profileAPI } from '@/features/profile/api/profile'
import { Modal } from '@/shared/components/ui/Modal'

interface AddCreditsModalProps {
    onClose: () => void
}

const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true)
            return
        }
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({ onClose }) => {
    const queryClient = useQueryClient()
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        staleTime: 60000,
    })
    const { data: overview } = useBillingOverview()
    const usdToInrRate = overview?.usdToInrRate ?? 95.26
    const [amountStr, setAmountStr] = useState('10')
    const [error, setError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleAmountChange = (val: string) => {
        // enforce whole numbers only by stripping any non-digits
        const cleanVal = val.replace(/\D/g, '')
        setAmountStr(cleanVal)
        setError(null)

        if (cleanVal === '') {
            setError('Please enter a USD amount.')
            return
        }

        const amountNum = parseInt(cleanVal, 10)
        if (amountNum < 1 || amountNum > 50) {
            setError('Amount must be a whole number between $1 and $50.')
        }
    }

    const handlePayment = async () => {
        if (!amountStr) {
            setError('Please enter a USD amount.')
            return
        }

        const amount = parseInt(amountStr, 10)
        if (isNaN(amount) || amount < 1 || amount > 50) {
            setError('Amount must be a whole number between $1 and $50.')
            return
        }

        const amountInCents = amount * 100
        setIsProcessing(true)
        setError(null)

        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                throw new Error(
                    'Failed to load Razorpay payment SDK. Check your internet connection.'
                )
            }

            const order = await billingAPI.createRazorpayOrder({ amountInCents })

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'December',
                description: `Add $${amount} Credits to Wallet`,
                order_id: order.orderId,
                handler: async function (response: any) {
                    setIsProcessing(true)
                    try {
                        const verifyRes = await billingAPI.verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })

                        if (verifyRes.success) {
                            setSuccessMessage(
                                `Successfully added $${amount}.00 credits to your wallet!`
                            )
                            await Promise.all([
                                queryClient.invalidateQueries({
                                    queryKey: ['billing-overview'],
                                }),
                                queryClient.invalidateQueries({ queryKey: ['profile'] }),
                            ])
                            setTimeout(() => {
                                onClose()
                            }, 2500)
                        } else {
                            throw new Error('Verification failed. Please contact support.')
                        }
                    } catch (err: any) {
                        setError(err?.message || 'Failed to verify payment signature.')
                    } finally {
                        setIsProcessing(false)
                    }
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false)
                    },
                },
                prefill: {
                    name: profile?.name || '',
                    email: profile?.email || '',
                },
                theme: {
                    color: '#FFFFFF',
                },
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.open()
        } catch (err: any) {
            setError(
                err?.message || err?.errors || 'An error occurred during payment initialization.'
            )
            setIsProcessing(false)
        }
    }

    const amountNum = parseInt(amountStr, 10)
    const inrEstimate =
        !isNaN(amountNum) && amountNum >= 1 && amountNum <= 50
            ? Math.round(amountNum * usdToInrRate)
            : null

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Add Wallet Credits"
            description="Top up your wallet balance to continue using AI models."
            variant="premium"
        >
            <div className="flex flex-col gap-4 py-1">
                {/* Amount Input Card */}
                <div className="flex flex-col gap-3 p-4 sm:p-5 bg-[#191919] border border-[#242323] rounded-xl">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="credit-amount-input"
                            className="text-[11px] font-medium text-[#7B7A79] uppercase tracking-wider block"
                        >
                            Enter Amount
                        </label>
                        {inrEstimate && !error && (
                            <span className="text-[12px] text-[#7B7A79] font-medium">
                                ≈ ₹{inrEstimate.toLocaleString('en-IN')} INR
                            </span>
                        )}
                    </div>

                    {/* Large focal input */}
                    <div className="relative flex items-center">
                        <span className="text-[#7B7A79] text-3xl sm:text-4xl font-medium mr-2 select-none">
                            $
                        </span>
                        <input
                            id="credit-amount-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={amountStr}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full bg-transparent text-white text-3xl sm:text-4xl font-medium focus:outline-none placeholder-[#3A3A3A] tracking-tight"
                            placeholder="10"
                            disabled={isProcessing || !!successMessage}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <p className="text-[12px] text-red-500 font-medium px-1 animate-in fade-in duration-150">
                        {error}
                    </p>
                )}

                {/* Success messaging */}
                {successMessage && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Footer actions */}
                <div className="mt-1 flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 select-none">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 fill-[#5893EE] shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z" />
                        </svg>
                        <span className="text-[12px] font-medium text-[#7B7A79]">
                            Secured by <span className="text-[#D6D5C9] font-medium">Razorpay</span>
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={isProcessing || !!successMessage || !amountStr || !!error}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-semibold px-5 py-2.5 rounded-xl focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[140px] cursor-pointer shadow-sm"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            `Pay ${inrEstimate ? `₹${inrEstimate.toLocaleString('en-IN')}` : `$${amountStr || 0}`}`
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
