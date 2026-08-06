import { useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import React, { useState } from 'react'

import { billingAPI } from '@/features/billing/api/billing'
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
    const [amountStr, setAmountStr] = useState('20')
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
        if (amountNum < 20 || amountNum > 100) {
            setError('Amount must be a whole number between $20 and $100.')
        }
    }

    const handlePayment = async () => {
        if (!amountStr) {
            setError('Please enter a USD amount.')
            return
        }

        const amount = parseInt(amountStr, 10)
        if (isNaN(amount) || amount < 20 || amount > 100) {
            setError('Amount must be a whole number between $20 and $100.')
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
                    name: '',
                    email: '',
                },
                theme: {
                    color: '#FFFFFF', // clean white theme for checkout button
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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Add Wallet Credits"
            description="Enter a USD amount to top up your credits. Minimum $20, maximum $100."
            variant="premium"
        >
            <div className="flex flex-col gap-6 py-2">
                {/* amount input */}
                <div className="flex flex-col gap-2">
                    <label
                        htmlFor="credit-amount-input"
                        className="text-[11px] font-semibold text-[#8F8E8D] uppercase tracking-wider block"
                    >
                        Amount (USD)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-lg font-medium">
                            $
                        </span>
                        <input
                            id="credit-amount-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={amountStr}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className="w-full bg-white/[0.03] border border-[#2B2A27] rounded-xl pl-9 pr-4 py-4 text-white text-2xl font-mono font-medium focus:outline-none focus:border-white transition-colors shadow-inner"
                            placeholder="20"
                            disabled={isProcessing || !!successMessage}
                            autoComplete="off"
                        />
                    </div>
                    {/* error displayed directly below input in simple red text */}
                    {error && (
                        <p className="text-[12px] text-red-500 mt-1 px-1 animate-in fade-in duration-200">
                            {error}
                        </p>
                    )}
                </div>

                {/* success messaging (error is displayed above) */}
                {successMessage && (
                    <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* footer controls */}
                <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 opacity-60">
                        <svg
                            fill="#FFFFFF"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M22.436 0l-11.91 7.773-1.174 4.276 6.625-4.297L11.65 24h4.391l6.395-24zM14.26 10.098L3.389 17.166 1.564 24h9.008l3.688-13.902Z" />
                        </svg>
                        <span className="text-[11px] font-medium tracking-wide whitespace-nowrap text-[#8F8E8D]">
                            SECURED BY RAZORPAY
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handlePayment}
                        disabled={isProcessing || !!successMessage || !amountStr || !!error}
                        className="bg-white text-black hover:bg-neutral-200 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 text-[13px] font-semibold px-6 py-2.5 rounded-xl focus:outline-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center min-w-[150px] cursor-pointer"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            'Continue'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
