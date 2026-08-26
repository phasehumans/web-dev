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
                    {/* compact credits balance box */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-[#2B2A27] rounded-2xl p-5 sm:p-6 w-full max-w-[560px] bg-[#141414]">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] uppercase tracking-wider text-[#8F8E8D] font-semibold">
                                    Wallet Balance
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-[32px] sm:text-[36px] font-semibold text-white font-mono leading-none tracking-tight">
                                    {formatCents(remainingInCents)}
                                </span>
                                <span className="text-[12px] text-[#7B7A79] font-mono">USD</span>
                            </div>
                            <span className="text-[12px] text-[#7B7A79] mt-0.5">
                                Auto-deducted per token generation. Add from $1 to $50.
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddCreditsModal(true)}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-[13px] font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-sm text-center"
                            >
                                Add Credits
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* credits history section */}
            <div className="flex flex-col mb-6">
                <h2 className="text-[16px] font-medium text-[#D6D5C9] mb-3">Credits History</h2>
                <div className="flex flex-col border-t border-[#242323] pt-4">
                    {mergedHistory.length === 0 ? (
                        <div className="text-[13px] text-[#7B7A79] py-2">
                            No recent credit transactions.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Desktop header row */}
                            <div className="hidden md:grid grid-cols-5 gap-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 pb-1">
                                <div className="col-span-1">Date</div>
                                <div className="col-span-2">Details</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-1 text-right">Amount</div>
                            </div>

                            {/* Data rows (responsive on mobile, grid on desktop) */}
                            <div className="flex flex-col gap-2.5 md:gap-3.5">
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
                                        <React.Fragment key={tx.id}>
                                            {/* Mobile card view (< md) */}
                                            <div className="md:hidden flex flex-col p-3.5 bg-[#191919] border border-[#242323] rounded-xl gap-2 text-[13px]">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[12px] text-[#7B7A79] font-mono">
                                                        {formattedDate}
                                                    </span>
                                                    <span className="text-[14px] font-semibold text-emerald-400 font-mono">
                                                        +{formatCents(tx.amountInCents)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[#D6D5C9] font-medium truncate">
                                                        {tx.methodOrCode}
                                                    </span>
                                                    <span className="text-[10.5px] text-[#7B7A79] font-mono mt-0.5 truncate">
                                                        {txId}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 border-t border-[#242323]/50 text-[11.5px]">
                                                    <span className="text-[#7B7A79]">Status</span>
                                                    <span
                                                        className={`font-medium ${statusConfig.color}`}
                                                    >
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Desktop grid row (>= md) */}
                                            <div className="hidden md:grid grid-cols-5 gap-4 items-center text-[13px] text-neutral-300">
                                                <div className="col-span-1 text-[#7B7A79]">
                                                    {formattedDate}
                                                </div>
                                                <div className="col-span-2 flex flex-col min-w-0">
                                                    <span
                                                        className="text-neutral-300 truncate"
                                                        title={tx.methodOrCode}
                                                    >
                                                        {tx.methodOrCode}
                                                    </span>
                                                    <span
                                                        className="text-[10px] text-[#7B7A79] font-mono mt-0.5 truncate"
                                                        title={txId}
                                                    >
                                                        {txId}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`col-span-1 font-medium ${statusConfig.color}`}
                                                >
                                                    {statusConfig.label}
                                                </div>
                                                <div className="col-span-1 text-right text-[#D6D5C9] font-medium font-mono">
                                                    +{formatCents(tx.amountInCents)}
                                                </div>
                                            </div>
                                        </React.Fragment>
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
