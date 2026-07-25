import React, { useState } from 'react'

import type { PullRequestReview, ReviewFinding } from '../api/review'

import { SessionPrTooltip } from '@/features/sessions/components/SessionPrTooltip'
import { Icons } from '@/shared/components/ui/Icons'

interface ReviewDetailViewProps {
    review: PullRequestReview
    onBack: () => void
    sessionTitle?: string
    onOpenPreferences?: () => void
}

export const ReviewDetailView: React.FC<ReviewDetailViewProps> = ({
    review,
    onBack,
    sessionTitle,
    onOpenPreferences,
}) => {
    const [activeTab, setActiveTab] = useState<'DESCRIPTION' | 'CHANGES' | 'DISCUSSION'>(
        'DESCRIPTION'
    )
    const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>(
        'ALL'
    )

    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isCommentOpen, setIsCommentOpen] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [autoReview, setAutoReview] = useState(review.isAutoReview)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [commentsList, setCommentsList] = useState<
        Array<{ id: string; author: string; text: string; date: string }>
    >([])

    const showToast = (msg: string) => {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 2500)
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(review.prUrl)
        showToast('Copied PR link to clipboard!')
        setIsMenuOpen(false)
    }

    const handleCopyBranch = () => {
        const text = `${review.repository}#${review.prNumber}`
        navigator.clipboard.writeText(text)
        showToast('Copied PR branch reference!')
        setIsMenuOpen(false)
    }

    const handleAddComment = () => {
        if (!commentText.trim()) return
        const newComment = {
            id: Date.now().toString(),
            author: 'You',
            text: commentText.trim(),
            date: new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }),
        }
        setCommentsList((prev) => [newComment, ...prev])
        setCommentText('')
        setIsCommentOpen(false)
        setActiveTab('DISCUSSION')
        showToast('Comment submitted!')
    }

    const findings = (review.findings || []) as ReviewFinding[]
    const filteredFindings =
        severityFilter === 'ALL' ? findings : findings.filter((f) => f.severity === severityFilter)

    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length
    const warningCount = findings.filter((f) => f.severity === 'WARNING').length
    const infoCount = findings.filter((f) => f.severity === 'INFO').length

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200 relative">
            {/* Toast feedback notification */}
            {toastMessage && (
                <div className="fixed top-20 right-8 z-[10000] bg-[#242323] border border-[#383736] text-[#D6D5C9] text-[12.5px] font-medium px-4 py-2.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
                    <Icons.Check className="w-4 h-4 text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between border-b border-[#282828] pb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-lg border border-[#383736] bg-[#202020] px-3.5 py-1.5 text-[13px] font-medium text-[#D6D5C9] hover:bg-[#282828] hover:text-white transition-colors cursor-pointer select-none"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Reviews</span>
                </button>

                {/* Header Action Controls */}
                <div className="flex items-center gap-2.5 relative">
                    {review.sessionId && (
                        <span className="flex items-center gap-1 rounded-lg bg-[#202020] px-2.5 py-1.5 text-[12px] font-medium text-[#A3A2A0] border border-[#2A2A2A]">
                            <Icons.Terminal className="h-3.5 w-3.5 text-blue-400" />
                            Session
                        </span>
                    )}

                    {/* Three Dots Menu Button */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsMenuOpen(!isMenuOpen)
                                setIsCommentOpen(false)
                            }}
                            className="p-1.5 rounded-lg border border-[#383736] bg-[#202020] hover:bg-[#282828] text-[#D6D5C9] transition-colors cursor-pointer flex items-center justify-center min-w-[34px] min-h-[34px]"
                            title="More options"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="6" cy="12" r="1.5" />
                                <circle cx="18" cy="12" r="1.5" />
                            </svg>
                        </button>

                        {/* Three Dots Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-11 z-[9999] w-64 rounded-xl border border-[#2C2C2C] bg-[#1C1C1C] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5 text-[13px] text-[#D6D5C9]">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-left transition-colors cursor-pointer"
                                >
                                    <span>Copy link to PR</span>
                                    <span className="text-[10px] font-mono text-[#7B7A79]">
                                        Cmd L
                                    </span>
                                </button>
                                <button
                                    onClick={handleCopyBranch}
                                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-left transition-colors cursor-pointer"
                                >
                                    <span>Copy PR branch name</span>
                                    <span className="text-[10px] font-mono text-[#7B7A79]">
                                        Cmd B
                                    </span>
                                </button>

                                {review.sessionId && (
                                    <button
                                        onClick={() => {
                                            showToast('Opening connected session...')
                                            setIsMenuOpen(false)
                                        }}
                                        className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-left transition-colors cursor-pointer"
                                    >
                                        <span>Open December session</span>
                                        <Icons.ExternalLink className="w-3.5 h-3.5 text-[#7B7A79]" />
                                    </button>
                                )}

                                <div className="my-1 border-t border-[#2A2A2A]" />

                                <div
                                    onClick={() => setAutoReview(!autoReview)}
                                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#282828] transition-colors cursor-pointer"
                                >
                                    <span>Auto-review this PR</span>
                                    <div
                                        className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                                            autoReview ? 'bg-purple-500' : 'bg-[#333333]'
                                        }`}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                                autoReview ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false)
                                        if (onOpenPreferences) onOpenPreferences()
                                    }}
                                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-[#282828] text-left transition-colors cursor-pointer"
                                >
                                    <span>Review settings</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Comment Button & Popover Modal */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsCommentOpen(!isCommentOpen)
                                setIsMenuOpen(false)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#383736] bg-[#242323] hover:bg-[#2C2B2B] hover:text-white text-[12px] font-medium text-[#D6D5C9] transition-colors cursor-pointer"
                        >
                            <span>Comment</span>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>

                        {/* Comment Popover Modal */}
                        {isCommentOpen && (
                            <div className="absolute right-0 top-11 z-[9999] w-80 md:w-96 rounded-xl border border-[#2C2C2C] bg-[#1C1C1C] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3">
                                <textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                    rows={4}
                                    className="w-full rounded-lg border border-[#2E2E2E] bg-[#141414] p-3 text-[13px] text-[#D6D5C9] placeholder:text-[#6E6E6E] focus:border-[#5A5A5A] focus:outline-none resize-none"
                                />

                                <p className="text-[11.5px] text-[#7B7A79] leading-snug">
                                    Leave comments or notes on this pull request review.
                                </p>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#2A2A2A]">
                                    <button
                                        onClick={() => setIsCommentOpen(false)}
                                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#A3A2A0] hover:text-white transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim()}
                                        className="px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:pointer-events-none text-white text-[12px] font-medium transition-colors cursor-pointer"
                                    >
                                        Submit Comment
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PR Header Section */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-lg">
                <div className="flex items-center gap-2.5 flex-wrap">
                    {review.prNumber ? (
                        <SessionPrTooltip
                            session={{
                                id: review.id,
                                title: review.title,
                                prNumber: review.prNumber,
                                prUrl: review.prUrl,
                                repoName: review.repository,
                                prTitle: review.title,
                                branchName: (review as any).branchName || (review as any).branch,
                                additions: (review as any).additions,
                                deletions: (review as any).deletions,
                            }}
                        />
                    ) : null}
                    <span className="text-[13px] font-mono text-[#7B7A79]">
                        {review.repository}
                    </span>
                    {review.isAutoReview && (
                        <span className="px-2 py-0.5 rounded-md bg-[#202020] text-[11px] font-medium text-[#A3A2A0]">
                            December Agent
                        </span>
                    )}
                </div>

                <h1 className="text-[22px] font-semibold text-white leading-snug">
                    {review.title || 'Untitled Review'}
                </h1>

                <div className="flex items-center gap-4 text-[13px] text-[#7B7A79] flex-wrap font-mono">
                    <div className="flex items-center gap-1.5 text-[#D6D5C9]">
                        <Icons.GitPullRequest className="w-4 h-4 text-purple-400" />
                        <span>{review.author || 'Author'}</span>
                    </div>
                    <span>•</span>
                    <span>
                        Created on{' '}
                        {new Date(review.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-sans font-medium">
                        {findings.length} Analysis findings generated
                    </span>
                </div>
            </div>

            {/* Main Content: Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                {/* Left Panel */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-[#282828] pb-1">
                        <button
                            onClick={() => setActiveTab('DESCRIPTION')}
                            className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                                activeTab === 'DESCRIPTION'
                                    ? 'border-purple-400 text-white font-semibold'
                                    : 'border-transparent text-[#7B7A79] hover:text-[#D6D5C9]'
                            }`}
                        >
                            Description & Summary
                        </button>
                        <button
                            onClick={() => setActiveTab('CHANGES')}
                            className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'CHANGES'
                                    ? 'border-purple-400 text-white font-semibold'
                                    : 'border-transparent text-[#7B7A79] hover:text-[#D6D5C9]'
                            }`}
                        >
                            <span>Code Findings & Diffs</span>
                            <span className="rounded-full bg-[#242323] px-2 py-0.5 text-[10px] text-purple-300">
                                {findings.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('DISCUSSION')}
                            className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                                activeTab === 'DISCUSSION'
                                    ? 'border-purple-400 text-white font-semibold'
                                    : 'border-transparent text-[#7B7A79] hover:text-[#D6D5C9]'
                            }`}
                        >
                            Discussion
                        </button>
                    </div>

                    {/* Tab 1: Description */}
                    {activeTab === 'DESCRIPTION' && (
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-6 flex flex-col gap-3">
                                <h3 className="text-[14px] font-semibold text-[#D6D5C9] uppercase tracking-wider">
                                    AI Summary & Analysis
                                </h3>
                                <div className="text-[13.5px] text-[#A3A2A0] leading-relaxed whitespace-pre-line font-mono bg-[#141414] p-4 rounded-lg border border-[#242323]">
                                    {review.summary ||
                                        'No summary available for this pull request review.'}
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-6 flex flex-col gap-4">
                                <h3 className="text-[14px] font-semibold text-white">
                                    Review Highlights
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-4 rounded-lg bg-[#202020] border border-[#282828] flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                                            Critical Issues
                                        </span>
                                        <span className="text-[24px] font-bold text-white">
                                            {criticalCount}
                                        </span>
                                        <span className="text-[12px] text-[#7B7A79]">
                                            Requires immediate fix
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[#202020] border border-[#282828] flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                                            Warnings
                                        </span>
                                        <span className="text-[24px] font-bold text-white">
                                            {warningCount}
                                        </span>
                                        <span className="text-[12px] text-[#7B7A79]">
                                            Potential bugs & smells
                                        </span>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[#202020] border border-[#282828] flex flex-col gap-1">
                                        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                                            Suggestions
                                        </span>
                                        <span className="text-[24px] font-bold text-white">
                                            {infoCount}
                                        </span>
                                        <span className="text-[12px] text-[#7B7A79]">
                                            Refactoring & style
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Code Findings */}
                    {activeTab === 'CHANGES' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[#7B7A79]">
                                    Showing {filteredFindings.length} of {findings.length} findings
                                </span>

                                {/* Filter Tabs */}
                                <div className="flex items-center gap-1 bg-[#141414] border border-[#282828] p-1 rounded-lg">
                                    {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(
                                        (sev) => (
                                            <button
                                                key={sev}
                                                onClick={() => setSeverityFilter(sev)}
                                                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                                    severityFilter === sev
                                                        ? 'bg-[#282828] text-white'
                                                        : 'text-[#888E8D] hover:text-white'
                                                }`}
                                            >
                                                {sev}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {filteredFindings.length === 0 ? (
                                <div className="p-12 rounded-xl border border-[#282828] bg-[#1A1A1A] text-center text-[#7B7A79] text-[13px]">
                                    No findings match the selected severity filter.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {filteredFindings.map((finding) => {
                                        const isCritical = finding.severity === 'CRITICAL'
                                        const isWarning = finding.severity === 'WARNING'

                                        return (
                                            <div
                                                key={finding.id}
                                                className="rounded-xl border border-[#282828] bg-[#1A1A1A] overflow-hidden flex flex-col"
                                            >
                                                {/* Header bar of finding */}
                                                <div className="p-4 border-b border-[#282828] bg-[#141414] flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                isCritical
                                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                    : isWarning
                                                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}
                                                        >
                                                            {finding.severity}
                                                        </span>
                                                        <span className="text-[14px] font-semibold text-white truncate">
                                                            {finding.title}
                                                        </span>
                                                    </div>
                                                    <span className="text-[12px] font-mono text-[#7B7A79] shrink-0 bg-[#202020] px-2.5 py-1 rounded-md border border-[#2A2A2A]">
                                                        {finding.filePath} : L{finding.lineNumber}
                                                    </span>
                                                </div>

                                                <div className="p-5 flex flex-col gap-4">
                                                    <p className="text-[13px] text-[#A3A2A0] leading-relaxed">
                                                        {finding.description}
                                                    </p>

                                                    {/* Code Snippets */}
                                                    {(finding.originalSnippet ||
                                                        finding.proposedSnippet) && (
                                                        <div className="flex flex-col gap-3 rounded-lg border border-[#282828] bg-[#141414] p-4 font-mono text-[12px]">
                                                            {finding.originalSnippet && (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className="text-[11px] text-red-400/90 uppercase tracking-wider font-sans font-semibold">
                                                                        - Original Code
                                                                    </span>
                                                                    <pre className="bg-red-950/30 text-red-300 p-3 rounded-md border border-red-900/30 overflow-x-auto whitespace-pre">
                                                                        {finding.originalSnippet}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {finding.proposedSnippet && (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <span className="text-[11px] text-emerald-400/90 uppercase tracking-wider font-sans font-semibold">
                                                                        + Proposed Fix
                                                                    </span>
                                                                    <pre className="bg-emerald-950/30 text-emerald-300 p-3 rounded-md border border-emerald-900/30 overflow-x-auto whitespace-pre">
                                                                        {finding.proposedSnippet}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Discussion */}
                    {activeTab === 'DISCUSSION' && (
                        <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-6 flex flex-col gap-4">
                            <h3 className="text-[14px] font-semibold text-white">
                                Pull Request Discussion & Comments
                            </h3>

                            {/* User Comments Feed */}
                            {commentsList.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    {commentsList.map((c) => (
                                        <div
                                            key={c.id}
                                            className="p-4 rounded-xl bg-[#141414] border border-[#2A2A2A] flex flex-col gap-2"
                                        >
                                            <div className="flex items-center justify-between text-[12px]">
                                                <span className="font-semibold text-blue-400">
                                                    {c.author}
                                                </span>
                                                <span className="text-[#7B7A79]">{c.date}</span>
                                            </div>
                                            <p className="text-[13px] text-[#D6D5C9] leading-relaxed">
                                                {c.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-2 flex flex-col gap-3">
                                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#7B7A79]">
                                    Automated Feedback
                                </span>
                                {findings.map((finding, idx) => (
                                    <div
                                        key={`comment-${idx}`}
                                        className="p-4 rounded-lg bg-[#141414] border border-[#282828] flex flex-col gap-2"
                                    >
                                        <div className="flex items-center justify-between text-[12px]">
                                            <span className="font-semibold text-purple-400">
                                                December Agent
                                            </span>
                                            <span className="font-mono text-[#7B7A79]">
                                                {finding.filePath}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-[#D6D5C9]">
                                            {finding.title}: {finding.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar Panel */}
                <div className="lg:col-span-3 flex flex-col gap-5">
                    {/* Score Card */}
                    <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-5 flex flex-col gap-3 shadow-lg">
                        <span className="text-[11px] font-semibold text-[#8F8E8D] uppercase tracking-wider">
                            Code Quality Rating
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[36px] font-bold text-white leading-none">
                                {review.score}
                            </span>
                            <span className="text-[14px] text-[#8F8E8D]">/ 100</span>
                        </div>
                        <div className="w-full bg-[#242323] h-2 rounded-full overflow-hidden">
                            <div
                                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(5, review.score)}%` }}
                            />
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="rounded-xl border border-[#282828] bg-[#1A1A1A] p-5 flex flex-col gap-4 shadow-lg">
                        <h4 className="text-[13px] font-semibold text-white uppercase tracking-wider border-b border-[#282828] pb-2">
                            Pull Request Info
                        </h4>

                        <div className="flex flex-col gap-3 text-[13px]">
                            <div className="flex items-center justify-between">
                                <span className="text-[#7B7A79]">Status</span>
                                <span className="rounded-md bg-[#202020] px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                                    {review.status}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#7B7A79]">Author</span>
                                <span className="text-[#D6D5C9] font-medium">
                                    {review.author || 'Unknown'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#7B7A79]">Repository</span>
                                <span className="text-[#D6D5C9] font-mono text-[12px] truncate max-w-[140px]">
                                    {review.repository}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[#7B7A79]">PR Number</span>
                                <span className="text-purple-400 font-mono">
                                    #{review.prNumber}
                                </span>
                            </div>

                            {review.sessionId && (
                                <div className="flex items-center justify-between border-t border-[#282828] pt-2">
                                    <span className="text-[#7B7A79]">Session</span>
                                    <span className="text-blue-400 font-mono text-[12px]">
                                        #{review.sessionId.slice(0, 8)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
