import React, { useState, useEffect, useCallback } from 'react'

import { reviewAPI, type PullRequestReview } from '../../review/api/review'
import { ReviewPreferencesDrawer } from '../../review/components/ReviewPreferencesDrawer'
import { useSessions } from '../hooks/useSessions'

import { SessionPrTooltip } from './SessionPrTooltip'

import { MobileBreadcrumbsHeader } from '@/features/navigation/components/MobileBreadcrumbsHeader'
import { Icons } from '@/shared/components/ui/Icons'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Tooltip } from '@/shared/components/ui/Tooltip'

interface ReviewPageProps {
    onNewProject?: () => void
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ onNewProject }) => {
    const [prUrl, setPrUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const [reviews, setReviews] = useState<PullRequestReview[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest')
    const [isSortOpen, setIsSortOpen] = useState(false)
    const [visibleCount, setVisibleCount] = useState(20)
    const sortDropdownRef = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                sortDropdownRef.current &&
                !sortDropdownRef.current.contains(event.target as Node)
            ) {
                setIsSortOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const { data: sessionsData } = useSessions()
    const sessions = sessionsData?.sessions || []

    const getSessionTitle = (sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId)
        const title = session?.title || session?.projectName || 'Untitled Session'
        const maxLen = 30
        const displayTitle = title.length > maxLen ? `${title.slice(0, maxLen).trim()}...` : title
        return `Session: ${displayTitle}`
    }

    const fetchReviews = useCallback(async () => {
        try {
            const res: any = await reviewAPI.getReviews({
                limit: 50,
                search: searchQuery.trim() || undefined,
            })
            const list = res?.data?.reviews || res?.reviews || []
            setReviews(list)
        } catch (err) {
            console.error('Failed to fetch reviews:', err)
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery])

    useEffect(() => {
        fetchReviews()
    }, [fetchReviews])

    // Poll for pending or in-progress reviews
    useEffect(() => {
        const hasPending = reviews.some((r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS')
        if (!hasPending) return

        const interval = setInterval(() => {
            fetchReviews()
        }, 2500)

        return () => clearInterval(interval)
    }, [reviews, fetchReviews])

    const handleOpenPrInGithub = (review: PullRequestReview) => {
        const url =
            review.prUrl ||
            (review.repository && review.prNumber
                ? `https://github.com/${review.repository}/pull/${review.prNumber}`
                : undefined)
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!prUrl.trim() || isSubmitting) return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            await reviewAPI.submitReview(prUrl.trim())
            const submittedUrl = prUrl.trim()
            setPrUrl('')
            fetchReviews()
            window.open(submittedUrl, '_blank', 'noopener,noreferrer')
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit PR for review')
        } finally {
            setIsSubmitting(false)
        }
    }

    const filteredReviews = reviews
        .filter((review) => {
            if (!searchQuery.trim()) return true
            const q = searchQuery.toLowerCase().trim()
            return (
                (review.title && review.title.toLowerCase().includes(q)) ||
                (review.repository && review.repository.toLowerCase().includes(q)) ||
                (review.prNumber && review.prNumber.toString().includes(q)) ||
                (review.sessionId && review.sessionId.toLowerCase().includes(q))
            )
        })
        .sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime()
            const timeB = new Date(b.createdAt).getTime()
            return sortOption === 'newest' ? timeB - timeA : timeA - timeB
        })

    useEffect(() => {
        setVisibleCount(20)
    }, [filteredReviews.length])

    const formatDate = (dInput: string | Date) => {
        const d = new Date(dInput)
        if (isNaN(d.getTime())) return ''
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        })
    }

    const formatTooltipDate = (dInput: string | Date, prefix: 'Created' | 'Updated') => {
        const d = new Date(dInput)
        if (isNaN(d.getTime())) return `${prefix} on Unknown`
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
        const month = d.toLocaleDateString('en-US', { month: 'long' })
        const day = d.getDate()
        const year = d.getFullYear()
        const time = d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        return `${prefix} on ${weekday}, ${month} ${day}, ${year} at ${time}`
    }

    return (
        <div className="relative h-full w-full flex-1 overflow-y-auto bg-background font-sans no-scrollbar">
            <MobileBreadcrumbsHeader currentPage="Review" onHomeClick={onNewProject} />
            <div className="relative z-10 mx-auto max-w-6xl px-3.5 sm:px-6 pb-8 pt-4 md:p-16">
                {/* Top Header */}
                <div className="mb-6 flex flex-col">
                    <h1 className="text-[24px] font-medium text-[#D6D5C9] mb-1">Review</h1>
                    <p className="text-[13px] text-[#7B7A79]">
                        Review GitHub pull requests with automated AI code quality summaries,
                        security checks, and diff analysis.
                    </p>
                </div>

                {/* Main PR Submission Input Section */}
                <div className="mb-6 flex flex-col gap-2.5">
                    <form
                        onSubmit={handleSubmit}
                        className="relative w-full max-w-xl flex flex-row items-center gap-2"
                    >
                        <div className="relative flex-1">
                            <Icons.GitPullRequest className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B7A79]" />
                            <input
                                type="text"
                                value={prUrl}
                                onChange={(e) => setPrUrl(e.target.value)}
                                placeholder="https://github.com/owner/repo/pull/123"
                                className="w-full rounded-lg border border-[#282828] bg-[#202020] py-1.5 pl-9 pr-4 text-[13px] text-[#D6D5C9] transition-colors placeholder:text-[#949494] hover:bg-[#282828] focus:border-[#7B7A79] focus:bg-[#202020] focus:outline-none"
                                disabled={isSubmitting}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!prUrl.trim() || isSubmitting}
                            className="rounded-lg border border-[#383736] bg-[#242323] hover:bg-[#2C2B2B] hover:text-white text-[#D6D5C9] text-[13px] font-medium px-4 py-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center shrink-0 justify-center cursor-pointer"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Analyzing...</span>
                                </div>
                            ) : (
                                <span>Submit PR</span>
                            )}
                        </button>
                    </form>

                    {submitError && (
                        <div className="text-[12px] text-red-400 bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg mt-1">
                            {submitError}
                        </div>
                    )}
                </div>

                {/* Subheading + Search & Sort Controls (only show when reviews exist) */}
                {reviews.length > 0 && (
                    <>
                        <div className="mb-3">
                            <h2 className="text-[16px] font-medium text-[#D6D5C9]">
                                Recent Reviews
                            </h2>
                        </div>

                        {/* Search Bar & Sort Dropdown Row */}
                        <div className="relative z-10 mb-4 flex w-full items-center gap-2">
                            <div className="relative flex-1 max-w-full md:max-w-[320px]">
                                <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B7A79]" />
                                <input
                                    type="text"
                                    placeholder="Search reviews..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-lg border border-[#282828] bg-[#202020] py-1.5 pl-9 pr-4 text-[13px] text-[#949494] transition-colors placeholder:text-[#949494] hover:bg-[#282828] focus:border-[#7B7A79] focus:bg-[#202020] focus:outline-none"
                                />
                            </div>

                            <div className="hidden md:flex flex-1" />

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="relative" ref={sortDropdownRef}>
                                    <button
                                        onClick={() => setIsSortOpen(!isSortOpen)}
                                        className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#282828] bg-[#202020] px-2.5 sm:px-4 py-1.5 text-[12px] sm:text-[13px] text-[#949494] transition-colors hover:bg-[#282828] cursor-pointer"
                                    >
                                        <span className="hidden sm:inline">Sort:</span>{' '}
                                        {sortOption === 'newest' ? 'Newest' : 'Oldest'}
                                        <Icons.ChevronDown className="h-3.5 w-3.5 text-[#7B7A79]" />
                                    </button>
                                    {isSortOpen && (
                                        <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-[#383736] bg-[#1E1E1E] py-2 shadow-xl">
                                            <div className="mb-1 border-b border-[#383736] px-3 pb-2 text-[12px] font-medium text-[#7B7A79]">
                                                Sort by
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSortOption('newest')
                                                    setIsSortOpen(false)
                                                }}
                                                className="flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-[#D6D5C9] hover:bg-[#242323] cursor-pointer"
                                            >
                                                Newest first
                                                {sortOption === 'newest' && (
                                                    <Icons.Check className="h-4 w-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSortOption('oldest')
                                                    setIsSortOpen(false)
                                                }}
                                                className="flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-[#D6D5C9] hover:bg-[#242323] cursor-pointer"
                                            >
                                                Oldest first
                                                {sortOption === 'oldest' && (
                                                    <Icons.Check className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Review List View */}
                {isLoading ? (
                    <div className="min-h-[420px] flex flex-col gap-2 pb-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <React.Fragment key={`review-skeleton-${index}`}>
                                {/* Mobile skeleton row (< md): borderless, minimal */}
                                <div className="md:hidden flex flex-col p-3 bg-white/[0.02] rounded-xl gap-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-[55%] bg-white/[0.05] rounded" />
                                        <Skeleton className="h-3.5 w-12 bg-white/[0.03] rounded" />
                                    </div>
                                    <Skeleton className="h-3 w-[75%] bg-white/[0.03] rounded" />
                                    <div className="flex items-center justify-between pt-1">
                                        <Skeleton className="h-3 w-16 bg-white/[0.03] rounded" />
                                        <Skeleton className="h-3 w-14 bg-white/[0.03] rounded" />
                                    </div>
                                </div>

                                {/* Desktop skeleton grid (>= md): borderless, matching exact row layout */}
                                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(85px,auto)_minmax(100px,auto)_minmax(100px,auto)_minmax(100px,auto)] items-center gap-3 md:gap-5 rounded-lg bg-white/[0.015] px-3 py-2.5">
                                    <div className="flex flex-col gap-1.5 w-full pr-4 min-w-0 justify-center">
                                        <Skeleton className="h-4 w-[60%] bg-white/[0.05]" />
                                        <Skeleton className="h-3 w-[80%] bg-white/[0.03]" />
                                    </div>
                                    <div className="truncate">
                                        <Skeleton className="h-3.5 w-12 bg-white/[0.03]" />
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Skeleton className="h-4 w-16 rounded bg-white/[0.03]" />
                                    </div>
                                    <div className="flex items-center">
                                        <Skeleton className="h-4 w-14 rounded bg-white/[0.03]" />
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Skeleton className="h-4 w-16 rounded bg-white/[0.03]" />
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="relative mb-6 h-28 w-32">
                            <svg
                                viewBox="0 0 128 112"
                                fill="none"
                                className="h-full w-full text-[#8A8987]"
                                aria-hidden="true"
                            >
                                <path
                                    d="M28 42.5 64 22l36 20.5v43L64 106 28 85.5v-43Z"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M28 42.5 64 63l36-20.5M64 63v43"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h2 className="text-[17px] font-medium text-[#D6D5C9]">
                            {reviews.length === 0 ? 'No reviews found' : 'No matching reviews'}
                        </h2>
                        <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#7B7A79]">
                            {reviews.length === 0
                                ? 'Submit a PR URL above to generate your first review report.'
                                : 'Try adjusting your search or filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="pb-4">
                            <div className="flex flex-col gap-1">
                                {filteredReviews.slice(0, visibleCount).map((review) => {
                                    const isPending =
                                        review.status === 'PENDING' ||
                                        review.status === 'IN_PROGRESS'

                                    const statusBadge = isPending ? (
                                        <span className="truncate rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                                            {review.status === 'PENDING'
                                                ? 'Queued'
                                                : 'Analyzing...'}
                                        </span>
                                    ) : review.status === 'COMPLETED' ? (
                                        <span className="truncate rounded-md bg-[#202020] px-2 py-0.5 text-[11px] font-medium text-[#A3A2A0]">
                                            Completed
                                        </span>
                                    ) : (
                                        <span className="truncate rounded-md bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
                                            Failed
                                        </span>
                                    )

                                    return (
                                        <React.Fragment key={review.id}>
                                            {/* Mobile Review Row (< md): seamless row matching Sessions page */}
                                            <div
                                                onClick={() => handleOpenPrInGithub(review)}
                                                className="md:hidden relative flex flex-col px-2.5 py-2.5 rounded-lg border border-transparent transition-all duration-200 hover:bg-[#191919] active:bg-[#191919] cursor-pointer gap-1"
                                            >
                                                {/* Top row: Title + Status badge */}
                                                <div className="flex items-center justify-between gap-2 min-w-0">
                                                    <span className="truncate text-[14px] font-medium text-[#D6D5C9] transition-colors hover:text-white flex-1 min-w-0">
                                                        {review.title || 'Untitled Review'}
                                                    </span>
                                                    <div className="shrink-0">{statusBadge}</div>
                                                </div>

                                                {/* Subtitle / summary preview */}
                                                <span className="truncate text-[12px] text-[#7B7A79] transition-colors">
                                                    {review.summary ||
                                                        'No summary available for this review.'}
                                                </span>

                                                {/* Metadata row: Date, Session ID, PR */}
                                                <div className="flex items-center justify-between text-[11.5px] text-[#7B7A79] pt-0.5">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span>{formatDate(review.createdAt)}</span>
                                                        {review.sessionId && (
                                                            <span className="truncate rounded bg-[#202020] px-1.5 py-0.5 font-mono text-[10.5px] text-[#A3A2A0]">
                                                                #{review.sessionId.slice(0, 8)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {review.prNumber && (
                                                        <span className="text-[11px] font-mono text-[#87B2F4] shrink-0">
                                                            PR #{review.prNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Desktop Review Grid Row (>= md) */}
                                            <div
                                                onClick={() => handleOpenPrInGithub(review)}
                                                className="hidden md:grid group relative cursor-pointer grid-cols-[minmax(0,1fr)_minmax(85px,auto)_minmax(100px,auto)_minmax(100px,auto)_minmax(100px,auto)] items-center gap-3 md:gap-5 rounded-lg border border-transparent px-3 py-2.5 transition-all duration-200 hover:bg-[#191919]"
                                            >
                                                {/* PR Title & Summary Description */}
                                                <div className="flex flex-col min-w-0 justify-center">
                                                    <span className="truncate text-[14px] font-medium text-[#D6D5C9] transition-colors group-hover:text-white">
                                                        {review.title || 'Untitled Review'}
                                                    </span>
                                                    <span className="truncate text-[12px] text-[#7B7A79] transition-colors">
                                                        {review.summary ||
                                                            'No summary available for this review.'}
                                                    </span>
                                                </div>

                                                {/* Date (Just beside title) */}
                                                <Tooltip
                                                    position="top"
                                                    content={formatTooltipDate(
                                                        review.createdAt,
                                                        'Created'
                                                    )}
                                                >
                                                    <div className="truncate text-[13px] text-[#7B7A79] transition-colors group-hover:text-[#A3A2A0]">
                                                        {formatDate(review.createdAt)}
                                                    </div>
                                                </Tooltip>

                                                {/* Session ID */}
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {review.sessionId ? (
                                                        <Tooltip
                                                            position="top"
                                                            content={getSessionTitle(
                                                                review.sessionId
                                                            )}
                                                        >
                                                            <span className="truncate rounded-md bg-[#202020] hover:bg-[#272727] transition-colors px-2 py-0.5 text-[11px] font-medium text-[#A3A2A0] select-none cursor-pointer">
                                                                #{review.sessionId.slice(0, 8)}
                                                            </span>
                                                        </Tooltip>
                                                    ) : null}
                                                </div>

                                                {/* PR Number Badge with Tooltip */}
                                                <div className="flex items-center">
                                                    {review.prNumber ? (
                                                        <SessionPrTooltip
                                                            session={{
                                                                id: review.id,
                                                                title: review.title,
                                                                prNumber: review.prNumber,
                                                                prUrl: review.prUrl,
                                                                repoName: review.repository,
                                                                prTitle: review.title,
                                                                branchName:
                                                                    (review as any).branchName ||
                                                                    (review as any).branch,
                                                                additions: (review as any)
                                                                    .additions,
                                                                deletions: (review as any)
                                                                    .deletions,
                                                            }}
                                                        />
                                                    ) : null}
                                                </div>

                                                {/* Status Badge */}
                                                <div className="flex items-center justify-end gap-2 min-w-0">
                                                    <Tooltip
                                                        position="top"
                                                        content={
                                                            review.status === 'COMPLETED'
                                                                ? 'Status: Review analysis complete'
                                                                : review.status === 'IN_PROGRESS'
                                                                  ? 'Status: Analyzing pull request...'
                                                                  : review.status === 'PENDING'
                                                                    ? 'Status: Queued for analysis'
                                                                    : 'Status: Review failed'
                                                        }
                                                    >
                                                        <div className="inline-flex">
                                                            {statusBadge}
                                                        </div>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Load More Button */}
                        {visibleCount < filteredReviews.length && (
                            <div className="flex justify-center pt-2 mb-8">
                                <button
                                    onClick={() =>
                                        setVisibleCount((prev) =>
                                            Math.min(prev + 20, filteredReviews.length)
                                        )
                                    }
                                    className="px-5 py-2 rounded-lg border border-[#383736] bg-[#141414] text-[13px] font-medium text-[#D6D5C9] hover:bg-[#242323] hover:text-white transition-all active:scale-95 cursor-pointer"
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ReviewPreferencesDrawer
                isOpen={isPreferencesOpen}
                onClose={() => setIsPreferencesOpen(false)}
                onSaved={fetchReviews}
            />
        </div>
    )
}
