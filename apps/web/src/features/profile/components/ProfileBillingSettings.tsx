import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AddCreditsModal } from './AddCreditsModal'
import { ProfileSettingsSkeleton } from './ProfileSettingsSkeleton'
import { RedeemCodeModal } from './RedeemCodeModal'

import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { profileAPI } from '@/features/profile/api/profile'

interface ProfileBillingSettingsProps {
    profile?: {
        name: string
        email: string
        username: string
    }
}

interface CreditTransaction {
    id: string
    date: string
    type: 'purchase' | 'gift'
    methodOrCode: string
    amountInCents: number
    status: 'SUCCESS' | 'PENDING' | 'FAILED'
}

export const ProfileBillingSettings: React.FC<ProfileBillingSettingsProps> = (props) => {
    const { profile: propProfile } = props
    const navigate = useNavigate()
    const { data: cachedProfile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: !propProfile,
    })

    const profile = propProfile || cachedProfile

    const {
        data: overview,
        isLoading: isOverviewLoading,
        error: overviewError,
    } = useBillingOverview()

    const [showRedeemModal, setShowRedeemModal] = useState(false)
    const [showAddCreditsModal, setShowAddCreditsModal] = useState(false)

    const formatCents = (cents: number | null) => {
        if (cents === null) return 'Unlimited'
        return `$${(cents / 100).toFixed(2)}`
    }

    const mergedHistory = React.useMemo(() => {
        if (!overview) return []

        const dbClaims: CreditTransaction[] = (overview.claims || []).map((claim: any) => ({
            id: claim.id,
            date: claim.createdAt,
            type: 'gift',
            methodOrCode: `Promo Code: ${claim.code}`,
            amountInCents: claim.amountInCents,
            status: 'SUCCESS',
        }))

        const dbTransactions: CreditTransaction[] = (overview.transactions || [])
            .filter((tx: any) => tx.status !== 'PENDING')
            .map((tx: any) => ({
                id: tx.id,
                date: tx.createdAt,
                type: 'purchase',
                methodOrCode: 'Card/UPI (Razorpay)',
                amountInCents: tx.amountInCents,
                status: tx.status as 'SUCCESS' | 'PENDING' | 'FAILED',
            }))

        const combined = [...dbClaims, ...dbTransactions]
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [overview])

    if (isOverviewLoading) {
        return <ProfileSettingsSkeleton activeTab="Billing" />
    }

    if (overviewError || !overview) {
        return (
            <div className="flex flex-col items-center justify-center py-20 w-full text-red-400">
                <span className="text-[14px] font-medium mb-2">
                    Failed to load billing settings
                </span>
                <span className="text-[13px] text-[#7B7A79]">
                    {(overviewError as any)?.message || 'Unknown error'}
                </span>
            </div>
        )
    }

    const remainingInCents = overview.creditBalance ?? 0

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9] animate-in fade-in duration-200">
            {/* credits section */}
            <div className="flex flex-col mb-6">
                <h1 className="text-[16px] font-medium text-[#D6D5C9] mb-3">Credits</h1>
                <div className="flex flex-col gap-4 border-t border-[#242323] pt-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Prepaid credits are used to power AI model completions and agent execution
                        in your workspaces.
                    </p>

                    {/* compact credits balance box */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#191919] rounded-xl p-4 sm:p-5 w-full max-w-[560px]">
                        <div className="flex flex-col gap-1">
                            <span className="text-[12px] font-medium text-[#7B7A79]">
                                Wallet Balance
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[24px] sm:text-[28px] font-medium text-[#D6D5C9] font-mono leading-none tracking-tight">
                                    {formatCents(remainingInCents)}
                                </span>
                                <span className="text-[11px] text-[#7B7A79] font-mono">USD</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setShowAddCreditsModal(true)}
                                className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-[#87B2F4] text-[#100E12] hover:bg-[#A3C7FF] text-[13px] font-medium transition-colors cursor-pointer text-center shadow-sm"
                            >
                                Add Credits
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* credits history section */}
            <div className="flex flex-col mb-0">
                <h2 className="text-[16px] font-medium text-[#D6D5C9] mb-3">Credits History</h2>
                <div className="flex flex-col border-t border-[#242323] pt-4">
                    {mergedHistory.length === 0 ? (
                        <div className="text-[13px] text-[#7B7A79] py-2">
                            No recent credit transactions.
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Header row */}
                            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 pb-1">
                                <div className="hidden md:block md:col-span-3">Date</div>
                                <div className="col-span-7 md:col-span-5">Details</div>
                                <div className="hidden md:block md:col-span-2">Status</div>
                                <div className="col-span-5 md:col-span-2 text-right">Amount</div>
                            </div>

                            {/* Data rows */}
                            <div className="flex flex-col divide-y divide-[#242323]/40">
                                {mergedHistory.map((tx) => {
                                    const formattedDate = new Date(tx.date).toLocaleDateString(
                                        undefined,
                                        {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        }
                                    )
                                    const txId =
                                        tx.id.startsWith('claim_') || tx.id.length < 5
                                            ? tx.id
                                            : `tx_${tx.id}`

                                    // status styling mapping
                                    const statusConfig = {
                                        SUCCESS: { label: 'Success', color: 'text-emerald-500' },
                                        PENDING: { label: 'Pending', color: 'text-amber-500' },
                                        FAILED: { label: 'Failed', color: 'text-red-500' },
                                    }[tx.status] || { label: tx.status, color: 'text-neutral-500' }

                                    return (
                                        <div key={tx.id} className="py-3 text-[13px]">
                                            {/* Mobile row layout (< md) */}
                                            <div className="md:hidden flex items-start justify-between gap-2">
                                                <div className="flex flex-col min-w-0 pr-2">
                                                    <span className="text-[#D6D5C9] font-medium truncate">
                                                        {tx.methodOrCode}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[11.5px] text-[#7B7A79] mt-0.5">
                                                        <span>{formattedDate}</span>
                                                        <span>•</span>
                                                        <span
                                                            className={`font-medium ${statusConfig.color}`}
                                                        >
                                                            {statusConfig.label}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-[#7B7A79] mt-0.5 truncate select-all">
                                                        {txId}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0 pt-0.5">
                                                    <span className="font-medium text-emerald-400 text-[13.5px]">
                                                        +{formatCents(tx.amountInCents)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Desktop grid layout (>= md) */}
                                            <div className="hidden md:grid grid-cols-12 gap-2 items-center text-neutral-300">
                                                <div className="col-span-3 text-[#7B7A79]">
                                                    {formattedDate}
                                                </div>
                                                <div className="col-span-5 flex flex-col min-w-0 pr-2">
                                                    <span
                                                        className="text-[#D6D5C9] font-medium truncate"
                                                        title={tx.methodOrCode}
                                                    >
                                                        {tx.methodOrCode}
                                                    </span>
                                                    <span
                                                        className="text-[11px] text-[#7B7A79] mt-0.5 truncate select-all"
                                                        title={txId}
                                                    >
                                                        {txId}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`col-span-2 font-medium ${statusConfig.color}`}
                                                >
                                                    {statusConfig.label}
                                                </div>
                                                <div className="col-span-2 text-right text-[#D6D5C9] font-medium">
                                                    +{formatCents(tx.amountInCents)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* promotions & usage section */}
            <div className="flex flex-col mb-6">
                <h2 className="text-[16px] font-medium text-[#D6D5C9] mb-3">Promotions & Usage</h2>
                <div className="flex flex-col gap-6 border-t border-[#242323] pt-4">
                    {/* gifted credits / coupon */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Redeem Coupon Code</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Have a promotional redeem code? Claim gifted credits here.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowRedeemModal(true)}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer"
                        >
                            Claim Credits
                        </button>
                    </div>

                    {/* usage dashboard link */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Usage Dashboard</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                View detailed metrics, token history, and cost distribution.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/settings/usage')}
                            className="flex items-center justify-center w-full sm:w-auto gap-1.5 px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors cursor-pointer"
                        >
                            View Usage
                            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* modals */}
            {showRedeemModal && <RedeemCodeModal onClose={() => setShowRedeemModal(false)} />}
            {showAddCreditsModal && (
                <AddCreditsModal onClose={() => setShowAddCreditsModal(false)} />
            )}
        </div>
    )
}
