import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { useCreditsHistory, useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { profileAPI } from '@/features/profile/api/profile'
import { Skeleton } from '@/shared/components/ui/Skeleton'

export const ProfileUsageSettings: React.FC = () => {
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
    })

    const { data: overview, isLoading: isOverviewLoading } = useBillingOverview()

    const [limit, setLimit] = useState(10)
    const [offset, setOffset] = useState(0)

    const [timeRange, setTimeRange] = useState<string>('30d')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    const formatRowDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatModelName = (model: string) => {
        if (!model) return '-'
        const lower = model.toLowerCase()
        if (lower.includes('claude-sonnet')) return 'Claude Sonnet'
        if (lower.includes('claude-opus')) return 'Claude Opus'
        if (lower.includes('claude-haiku')) return 'Claude Haiku'
        if (lower.includes('gpt-4o')) return 'GPT-4o'
        if (lower.includes('gpt-4-turbo') || lower.includes('gpt-4t')) return 'GPT-4 Turbo'
        if (lower.includes('gpt-4')) return 'GPT-4'
        if (lower.includes('gpt-3.5') || lower.includes('gpt-35')) return 'GPT-3.5 Turbo'
        if (lower.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash'
        if (lower.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro'
        if (lower.includes('gemini-2') || lower.includes('gemini')) return 'Gemini'
        if (lower.includes('dall-e-3') || lower.includes('dalle3')) return 'DALL-E 3'
        if (lower.includes('dall-e-2') || lower.includes('dalle2')) return 'DALL-E 2'

        return model
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    const handlePreviousPage = () => {
        if (offset >= limit) {
            setOffset((prev) => prev - limit)
        }
    }

    const handleNextPage = () => {
        const total = displayEvents.length
        if (offset + limit < total) {
            setOffset((prev) => prev + limit)
        }
    }

    // compute active date range from quick filter
    const activeDateRange = React.useMemo(() => {
        const end = new Date()
        const start = new Date()
        let days = 30
        if (timeRange === '1d') days = 1
        else if (timeRange === '7d') days = 7
        else if (timeRange === '30d') days = 30
        else if (timeRange === '90d') days = 90

        start.setDate(end.getDate() - days)

        return {
            start: start.toISOString(),
            end: end.toISOString(),
        }
    }, [timeRange])

    // fetch credits history with server-side pagination
    const {
        data: history,
        isLoading: isHistoryLoading,
        error,
    } = useCreditsHistory({
        limit,
        offset,
        periodStart: activeDateRange.start,
        periodEnd: activeDateRange.end,
    })

    // reset offset when date filters change
    useEffect(() => {
        setOffset(0)
    }, [activeDateRange.start, activeDateRange.end])

    const displayEvents = React.useMemo(() => {
        return history?.events ?? []
    }, [history?.events])

    // compute metrics stats
    const stats = React.useMemo(() => {
        const totalCost =
            (history?.periods ?? []).reduce((sum, p) => sum + p.costInCents, 0) / 100 ||
            displayEvents.reduce((sum, e) => sum + e.costInCents, 0) / 100
        const totalTokens = displayEvents.reduce((sum, e) => sum + e.totalTokens, 0)

        return {
            totalCost,
            totalTokens,
        }
    }, [displayEvents, history?.periods])

    const paginatedEvents = displayEvents
    const totalEvents = history?.total ?? 0
    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.max(Math.ceil(totalEvents / limit), 1)

    const isLoading = isOverviewLoading || isHistoryLoading

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            <div className="flex flex-col mb-0">
                <h1 className="text-[16px] font-medium mb-3">Usage</h1>
                <div className="flex flex-col border-t border-[#242323] pt-4 gap-4">
                    <p className="text-[13px] text-[#7B7A79]">
                        Track your token consumption, credit deductions, and generation costs across
                        recent model sessions.
                    </p>

                    {/* controls row */}
                    <div className="flex items-center justify-between mb-2">
                        {/* quick filters */}
                        <div className="flex items-center gap-1 bg-[#191919] p-0.5 rounded-lg border border-[#242323]">
                            {['1d', '7d', '30d', '90d'].map((range) => {
                                const isHighlighted = range === timeRange
                                return (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                                            isHighlighted
                                                ? 'bg-[#2B2A29] text-[#D6D5C9] shadow-sm'
                                                : 'text-[#7B7A79] hover:text-[#D6D5C9]'
                                        }`}
                                    >
                                        {range}
                                    </button>
                                )
                            })}
                        </div>

                        {/* total spent in place of download button */}
                        {isLoading ? (
                            <div className="flex items-center gap-1.5 text-[13px] text-neutral-400 font-medium">
                                <span>Total spent:</span>
                                <Skeleton className="h-4 w-12 bg-white/[0.06] rounded" />
                            </div>
                        ) : (
                            <div className="text-[13px] text-neutral-400 font-medium">
                                Total spent:{' '}
                                <span className="text-white font-medium">
                                    ${stats.totalCost.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* table / loader / error */}
                    {isLoading ? (
                        <div className="flex flex-col bg-[#191919] border border-[#242323] rounded-xl overflow-hidden min-h-[380px]">
                            <div className="bg-[#202020] border-b border-[#242323] px-3.5 sm:px-4 py-2.5 text-[12px] text-[#7B7A79] font-medium">
                                <div className="flex md:hidden items-center justify-between">
                                    <span>Project / Date</span>
                                    <span>Tokens / Cost</span>
                                </div>
                                <div className="hidden md:grid grid-cols-[130px_200px_1fr_100px_70px] items-center">
                                    <div>Date</div>
                                    <div>Project</div>
                                    <div>Model</div>
                                    <div>Token Usage</div>
                                    <div className="text-right">Cost</div>
                                </div>
                            </div>
                            {/* Mobile skeletons (< md) */}
                            <div className="flex md:hidden flex-col divide-y divide-[#242323]">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-3.5 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-28 bg-white/[0.05] rounded" />
                                            <Skeleton className="h-3.5 w-12 bg-white/[0.03] rounded" />
                                        </div>
                                        <Skeleton className="h-3 w-40 bg-white/[0.03] rounded" />
                                    </div>
                                ))}
                            </div>
                            {/* Desktop skeletons (>= md) */}
                            <div className="hidden md:flex flex-col divide-y divide-[#242323]">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[130px_200px_1fr_100px_70px] items-center py-3 px-4"
                                    >
                                        <div className="pr-4">
                                            <Skeleton className="h-3.5 w-20 bg-white/[0.05] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-3.5 w-24 bg-white/[0.03] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-3.5 w-20 bg-white/[0.03] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-3.5 w-14 bg-white/[0.03] rounded" />
                                        </div>
                                        <div className="flex justify-end pr-1">
                                            <Skeleton className="h-3.5 w-10 bg-white/[0.05] rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className="w-full flex justify-center text-red-500 text-sm">
                            {(error as any)?.message || 'Failed to load usage events'}
                        </div>
                    ) : (
                        <div className="flex flex-col bg-[#191919] border border-[#242323] rounded-xl overflow-hidden mt-1 min-h-[380px]">
                            {/* Table Header */}
                            <div className="bg-[#202020] border-b border-[#242323] px-3.5 sm:px-4 py-2.5 text-[12px] text-[#7B7A79] font-medium">
                                {/* Mobile Header (< md) */}
                                <div className="flex md:hidden items-center justify-between">
                                    <span>Project / Date</span>
                                    <span>Tokens / Cost</span>
                                </div>

                                {/* Desktop Header (>= md) */}
                                <div className="hidden md:grid grid-cols-[130px_200px_1fr_100px_70px] items-center">
                                    <div>Date</div>
                                    <div>Project</div>
                                    <div>Model</div>
                                    <div>Token Usage</div>
                                    <div className="text-right">Cost</div>
                                </div>
                            </div>

                            {/* Table Body */}
                            {paginatedEvents.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center min-h-[320px] p-6">
                                    <h3 className="text-[14px] font-medium text-[#D6D5C9]">
                                        No usage events found
                                    </h3>
                                    <p className="text-[13px] text-[#7B7A79]">
                                        No usage recorded for this period.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col divide-y divide-[#242323]">
                                    {paginatedEvents.map((row) => (
                                        <div key={row.id} className="flex flex-col">
                                            {/* Mobile row (< md) */}
                                            <div className="md:hidden p-3.5 flex flex-col gap-1.5 text-[13px]">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-medium text-[#D6D5C9] truncate">
                                                        {row.session?.title ||
                                                            row.project?.name ||
                                                            'Workspace Event'}
                                                    </span>
                                                    <span className="font-mono font-medium text-[#D6D5C9] shrink-0">
                                                        ${(row.costInCents / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11.5px] text-[#7B7A79]">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span>{formatRowDate(row.createdAt)}</span>
                                                        <span>•</span>
                                                        <span className="truncate">
                                                            {formatModelName(row.model)}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono text-[#7B7A79] shrink-0">
                                                        {row.totalTokens.toLocaleString()} tokens
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Desktop row (>= md) */}
                                            <div className="hidden md:grid grid-cols-[130px_200px_1fr_100px_70px] items-center px-4 py-3 text-[13px]">
                                                <div className="text-[#7B7A79]">
                                                    {formatRowDate(row.createdAt)}
                                                </div>
                                                <div className="text-[#D6D5C9] truncate pr-2 font-medium">
                                                    {row.session?.title || row.project?.name || '-'}
                                                </div>
                                                <div className="text-[#7B7A79] truncate pr-2">
                                                    {formatModelName(row.model)}
                                                </div>
                                                <div className="text-[#D6D5C9] font-mono text-[12px]">
                                                    {row.totalTokens.toLocaleString()}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[#D6D5C9] font-mono font-medium">
                                                        ${(row.costInCents / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* footer controls */}
                    {totalEvents > 0 && (
                        <div className="flex items-center justify-between mt-5">
                            {/* left limit selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[12.5px] text-[#7B7A79]">Show</span>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center justify-between w-[70px] bg-[#191919] border border-[#282828] rounded-lg px-2.5 py-1 text-[12.5px] text-[#D6D5C9] hover:bg-[#202020] transition-colors focus:outline-none focus:border-[#7B7A79] font-medium cursor-pointer"
                                    >
                                        <span>{limit}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-[#7B7A79]" />
                                    </button>

                                    {isDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsDropdownOpen(false)}
                                            />
                                            <div className="absolute bottom-full left-0 mb-1 z-20 w-[70px] bg-[#191919] border border-[#242323] rounded-lg shadow-xl overflow-hidden py-1">
                                                {[10, 20, 30].map((num) => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => {
                                                            setLimit(num)
                                                            setOffset(0)
                                                            setIsDropdownOpen(false)
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 text-[12.5px] transition-colors cursor-pointer ${
                                                            limit === num
                                                                ? 'bg-[#2B2A29] text-[#D6D5C9] font-medium'
                                                                : 'text-[#7B7A79] hover:bg-[#202020] hover:text-[#D6D5C9]'
                                                        }`}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* right page selectors */}
                            <div className="flex items-center gap-4 text-[12.5px] text-[#7B7A79] font-medium">
                                <span>
                                    {currentPage} of {totalPages}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={handlePreviousPage}
                                        disabled={offset === 0}
                                        className="p-1.5 rounded-lg border border-[#383736] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#191919] transition-colors bg-[#141414] text-[#D6D5C9]"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={offset + limit >= totalEvents}
                                        className="p-1.5 rounded-lg border border-[#383736] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#191919] transition-colors bg-[#141414] text-[#D6D5C9]"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
