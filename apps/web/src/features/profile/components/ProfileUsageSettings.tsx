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
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

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

    // fetch credits history
    const {
        data: history,
        isLoading: isHistoryLoading,
        error,
    } = useCreditsHistory({
        limit: 100,
        offset: 0,
        periodStart: activeDateRange.start,
        periodEnd: activeDateRange.end,
    })

    // reset offset when filters change
    useEffect(() => {
        setOffset(0)
    }, [activeDateRange.start, activeDateRange.end, limit])

    // use real data. apply date filtering on frontend.
    const displayEvents = React.useMemo(() => {
        const events = history?.events ?? []

        const startTime = new Date(activeDateRange.start).getTime()
        const endTime = new Date(activeDateRange.end).getTime()

        return events.filter((event) => {
            const eventTime = new Date(event.createdAt).getTime()
            return eventTime >= startTime && eventTime <= endTime
        })
    }, [history, activeDateRange])

    // compute metrics stats
    const stats = React.useMemo(() => {
        const totalCost = displayEvents.reduce((sum, e) => sum + e.costInCents, 0) / 100
        const totalTokens = displayEvents.reduce((sum, e) => sum + e.totalTokens, 0)

        return {
            totalCost,
            totalTokens,
        }
    }, [displayEvents])

    const paginatedEvents = displayEvents.slice(offset, offset + limit)
    const totalEvents = displayEvents.length
    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.max(Math.ceil(totalEvents / limit), 1)

    const isLoading = isOverviewLoading || isHistoryLoading

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            <div className="flex flex-col mb-8">
                <h1 className="text-[16px] font-medium mb-4">Usage</h1>
                <div className="flex flex-col border-t border-[#242323] pt-6">
                    {/* controls row */}
                    <div className="flex items-center justify-between mb-6">
                        {/* quick filters */}
                        <div className="flex items-center gap-1 bg-[#100E12] p-0.5 rounded-lg border border-[#242323]">
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
                                <span className="text-white font-semibold">
                                    ${stats.totalCost.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* table / loader / error */}
                    {isLoading ? (
                        <div className="flex flex-col gap-6">
                            {/* table skeleton */}
                            <div className="flex flex-col border border-[#242323] rounded-xl overflow-hidden bg-[#100E12] shadow-sm">
                                {/* table header skeleton */}
                                <div className="grid grid-cols-[130px_200px_1fr_100px_70px] items-center py-3.5 px-5 border-b border-[#242323] bg-[#141414] text-[12px] text-[#7B7A79] font-medium">
                                    <div>Date</div>
                                    <div>Project</div>
                                    <div>Model</div>
                                    <div>Token Usage</div>
                                    <div className="text-right">Cost</div>
                                </div>
                                {/* table rows skeleton */}
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[130px_200px_1fr_100px_70px] items-center py-5 px-5 border-b border-[#242323]/50 last:border-b-0"
                                    >
                                        <div className="pr-4">
                                            <Skeleton className="h-4 w-24 bg-white/[0.06] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-4 w-20 bg-white/[0.04] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-4 w-24 bg-white/[0.04] rounded" />
                                        </div>
                                        <div className="pr-4">
                                            <Skeleton className="h-4 w-14 bg-white/[0.04] rounded" />
                                        </div>
                                        <div className="flex justify-end pr-1">
                                            <Skeleton className="h-4 w-10 bg-white/[0.06] rounded" />
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
                        <div className="flex flex-col gap-6">
                            {/* table */}
                            <div className="flex flex-col border border-[#242323] rounded-xl overflow-hidden bg-[#100E12] shadow-sm">
                                {/* header */}
                                <div className="grid grid-cols-[130px_200px_1fr_100px_70px] items-center py-3.5 px-5 border-b border-[#242323] bg-[#141414] text-[12px] text-[#7B7A79] font-medium">
                                    <div>Date</div>
                                    <div>Project</div>
                                    <div>Model</div>
                                    <div>Token Usage</div>
                                    <div className="text-right">Cost</div>
                                </div>

                                {/* rows */}
                                <div className="flex flex-col min-h-[420px]">
                                    {paginatedEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center flex-1 h-[420px] text-[#7B7A79] text-[13px]">
                                            No usage events found for this period.
                                        </div>
                                    ) : (
                                        paginatedEvents.map((row) => {
                                            const isExpanded = expandedRowId === row.id
                                            return (
                                                <div
                                                    key={row.id}
                                                    className="flex flex-col border-b border-[#242323]/50 last:border-b-0"
                                                >
                                                    <div
                                                        onClick={() =>
                                                            setExpandedRowId(
                                                                isExpanded ? null : row.id
                                                            )
                                                        }
                                                        className="grid grid-cols-[130px_200px_1fr_100px_70px] items-center py-5 px-5 text-[13px] hover:bg-[#1A1918] transition-colors cursor-pointer select-none"
                                                    >
                                                        {/* date */}
                                                        <div className="text-[#D6D5C9]">
                                                            {formatRowDate(row.createdAt)}
                                                        </div>

                                                        {/* project */}
                                                        <div className="text-[#D6D5C9] truncate pr-2 font-medium">
                                                            {row.project?.name || '-'}
                                                        </div>

                                                        {/* model */}
                                                        <div className="text-[#7B7A79] truncate pr-2">
                                                            {formatModelName(row.model)}
                                                        </div>

                                                        {/* token usage */}
                                                        <div className="text-[#D6D5C9] font-mono text-[12px]">
                                                            {row.totalTokens.toLocaleString()}
                                                        </div>

                                                        {/* cost */}
                                                        <div className="text-right">
                                                            <span className="text-[#D6D5C9]">
                                                                $
                                                                {(row.costInCents / 100).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="bg-[#100E12] px-5 py-4 border-t border-[#242323] flex flex-col gap-3 text-[12.5px] text-[#7B7A79] animate-in slide-in-from-top-1 duration-150">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div>
                                                                    <span className="block text-[10px] text-[#8F8E8D] uppercase font-semibold tracking-wider mb-1">
                                                                        Input Tokens
                                                                    </span>
                                                                    <span className="font-mono text-white">
                                                                        {row.inputTokens.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-[10px] text-[#8F8E8D] uppercase font-semibold tracking-wider mb-1">
                                                                        Output Tokens
                                                                    </span>
                                                                    <span className="font-mono text-white">
                                                                        {row.outputTokens.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-[10px] text-[#8F8E8D] uppercase font-semibold tracking-wider mb-1">
                                                                        Request ID
                                                                    </span>
                                                                    <span className="font-mono text-white select-all">
                                                                        {row.externalRequestId ||
                                                                            'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-[10px] text-[#8F8E8D] uppercase font-semibold tracking-wider mb-1">
                                                                        Cost Breakdown
                                                                    </span>
                                                                    <span className="text-white font-mono">
                                                                        $
                                                                        {(
                                                                            row.costInCents / 100
                                                                        ).toFixed(4)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {row.metadata &&
                                                                Object.keys(row.metadata).length >
                                                                    0 && (
                                                                    <div className="pt-2 border-t border-[#242323]/50">
                                                                        <span className="block text-[10px] text-[#8F8E8D] uppercase font-semibold tracking-wider mb-1">
                                                                            Metadata
                                                                        </span>
                                                                        <pre className="text-[11px] font-mono text-white/70 overflow-x-auto bg-black/20 p-2 rounded border border-[#242323]">
                                                                            {JSON.stringify(
                                                                                row.metadata,
                                                                                null,
                                                                                2
                                                                            )}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
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
                                        className="flex items-center justify-between w-[70px] bg-[#100E12] border border-[#383736] rounded-lg px-2.5 py-1 text-[12.5px] text-[#D6D5C9] hover:bg-[#191919] transition-colors focus:outline-none focus:border-[#7B7A79] font-medium"
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
                                            <div className="absolute bottom-full left-0 mb-1 z-20 w-[70px] bg-[#100E12] border border-[#242323] rounded-lg shadow-xl overflow-hidden py-1">
                                                {[10, 20, 30].map((num) => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => {
                                                            setLimit(num)
                                                            setOffset(0)
                                                            setIsDropdownOpen(false)
                                                        }}
                                                        className={`w-full text-left px-2.5 py-1 text-[12.5px] transition-colors ${
                                                            num === limit
                                                                ? 'bg-[#2B2A29] text-[#D6D5C9] font-semibold'
                                                                : 'text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-[#191919]'
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
