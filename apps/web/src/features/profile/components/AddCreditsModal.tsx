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

const PRESET_TIERS = [
    { amount: 5, label: 'Starter' },
    { amount: 10, label: 'Popular', badge: 'Popular' },
    { amount: 25, label: 'Developer' },
    { amount: 50, label: 'Pro' },
]

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

    const selectPreset = (amount: number) => {
        setAmountStr(amount.toString())
        setError(null)
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
            description="Top up your wallet balance to continue using AI models ($1.00 to $50.00)."
            variant="premium"
        >
            <div className="flex flex-col gap-4 py-1">
                {/* Hero Amount Card */}
                <div className="flex flex-col gap-3.5 p-5 bg-[#141414] border border-[#2B2A27] rounded-2xl">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="credit-amount-input"
                            className="text-[11px] font-semibold text-[#8F8E8D] uppercase tracking-wider block"
                        >
                            Enter Amount
                        </label>
                        {inrEstimate && !error && (
                            <span className="text-[11.5px] text-[#A1A09E] font-mono">
                                ≈ ₹{inrEstimate.toLocaleString('en-IN')} INR
                            </span>
                        )}
                    </div>

                    {/* Large focal input */}
                    <div className="relative flex items-center">
                        <span className="text-neutral-400 font-mono text-3xl font-medium mr-2 select-none">
                            $
                        </span>
                        <input
                            id="credit-amount-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={amountStr}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full bg-transparent text-white text-3xl sm:text-4xl font-mono font-semibold focus:outline-none placeholder-neutral-700 tracking-tight"
                            placeholder="10"
                            disabled={isProcessing || !!successMessage}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>

                    {/* Minimalist preset pills */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#222120]">
                        <span className="text-[11px] text-[#7B7A79] mr-1 hidden sm:inline">
                            Presets:
                        </span>
                        {PRESET_TIERS.map((tier) => {
                            const isSelected = amountNum === tier.amount
                            return (
                                <button
                                    key={tier.amount}
                                    type="button"
                                    onClick={() => selectPreset(tier.amount)}
                                    disabled={isProcessing || !!successMessage}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-mono transition-all active:scale-95 cursor-pointer ${
                                        isSelected
                                            ? 'bg-white text-black font-semibold shadow-sm'
                                            : 'bg-white/[0.04] text-[#A1A09E] hover:text-white hover:bg-white/[0.08] border border-[#2B2A27]'
                                    }`}
                                >
                                    ${tier.amount}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Subtext info */}
                <div className="px-1 flex items-center justify-between text-[11.5px] text-[#7B7A79] font-mono">
                    <span>Rate: $1 ≈ ₹{usdToInrRate}</span>
                    <span>Billed via UPI / Cards</span>
                </div>

                {/* Error message */}
                {error && (
                    <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl animate-in fade-in duration-200">
                        {error}
                    </div>
                )}

                {/* Success messaging */}
                {successMessage && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Footer actions */}
                <div className="mt-2 flex items-center justify-between gap-3 pt-2 border-t border-[#222120]">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <svg
                            fill="#FFFFFF"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z" />
                        </svg>
                        <span className="text-[10.5px] font-medium tracking-wide whitespace-nowrap text-[#8F8E8D]">
                            SECURED BY RAZORPAY
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
