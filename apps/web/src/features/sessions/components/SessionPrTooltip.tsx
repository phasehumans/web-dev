import React, { useState, useRef } from 'react'

import { Icons } from '@/shared/components/ui/Icons'

interface SessionPrTooltipProps {
    session: {
        id: string
        title?: string | null
        prNumber?: number | null
        prState?: string | null
        prTitle?: string | null
        prUrl?: string | null
        branchName?: string | null
        additions?: number | null
        deletions?: number | null
        repoName?: string | null
    }
}

export const SessionPrTooltip: React.FC<SessionPrTooltipProps> = ({ session }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [hoveredIcon, setHoveredIcon] = useState<'copy' | 'github' | null>(null)

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    if (!session.prNumber) return null

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false)
            setHoveredIcon(null)
        }, 150)
    }

    const handleCopyBranch = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const branch =
            session.branchName ||
            (session.title
                ? session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                : `feature/pr-${session.prNumber}`)
        navigator.clipboard.writeText(branch)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleOpenGithub = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const url =
            session.prUrl || `https://github.com/phasehumans/december/pull/${session.prNumber}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const prTitle = session.prTitle || session.title || `feat: PR #${session.prNumber}`
    const repoName = session.repoName || 'december'
    const shortRepo = repoName.length > 6 ? `...${repoName.slice(-3)}` : repoName
    const additions = session.additions ?? 0
    const deletions = session.deletions ?? 0
    const branchName =
        session.branchName ||
        (session.title
            ? session.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            : `feature/pr-${session.prNumber}`)

    return (
        <div
            className="relative inline-flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => e.stopPropagation()}
        >
            {/* PR Status Badge - Clicking opens GitHub PR */}
            <button
                type="button"
                onClick={handleOpenGithub}
                className="flex items-center gap-1 rounded-md bg-[#202020] hover:bg-[#272727] active:scale-95 transition-all px-2 py-0.5 text-[11px] font-medium text-purple-400 cursor-pointer select-none border border-transparent hover:border-purple-500/20"
                title="Open Pull Request in GitHub"
            >
                <Icons.GitPullRequest className="h-3 w-3" />#{session.prNumber}
            </button>

            {/* Compact Tooltip Card */}
            {isOpen && (
                <div
                    className="absolute left-0 top-full mt-1 z-50 flex w-[290px] flex-col rounded-xl border border-[#2F2F2F] bg-[#1E1E1E] px-2.5 py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Row: PR Title + Action Icons (Copy & GitHub) */}
                    <div className="flex items-center justify-between gap-1.5">
                        <button
                            type="button"
                            onClick={handleOpenGithub}
                            className="truncate text-left text-[12.5px] font-medium text-[#E1E1E1] hover:text-purple-300 transition-colors max-w-[190px] leading-snug cursor-pointer"
                            title={`Open in GitHub: ${prTitle}`}
                        >
                            {prTitle}
                        </button>

                        {/* Action Icons Pill Capsule */}
                        <div className="flex items-center gap-0.5 shrink-0 relative bg-[#262626]/90 border border-[#333333] rounded-md p-0.5">
                            {/* Floating Tooltip for Icons */}
                            {hoveredIcon && (
                                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-50">
                                    <div className="rounded-md bg-[#181818] border border-[#333333] px-2 py-0.5 text-[10.5px] font-medium text-[#FFFFFF] shadow-xl whitespace-nowrap">
                                        {hoveredIcon === 'copy'
                                            ? copied
                                                ? 'Copied!'
                                                : 'Copy branch name'
                                            : 'Open in GitHub'}
                                    </div>
                                </div>
                            )}

                            {/* Copy Branch Icon */}
                            <button
                                type="button"
                                onClick={handleCopyBranch}
                                onMouseEnter={() => setHoveredIcon('copy')}
                                onMouseLeave={() => setHoveredIcon(null)}
                                className={`flex h-5 w-5 items-center justify-center rounded text-[#999999] transition-colors hover:bg-[#333333] hover:text-[#FFFFFF] cursor-pointer ${
                                    copied ? 'bg-[#333333] text-emerald-400' : ''
                                }`}
                                aria-label="Copy branch name"
                            >
                                {copied ? (
                                    <Icons.Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <Icons.Copy className="h-3 w-3" />
                                )}
                            </button>

                            {/* Open in GitHub Icon */}
                            <button
                                type="button"
                                onClick={handleOpenGithub}
                                onMouseEnter={() => setHoveredIcon('github')}
                                onMouseLeave={() => setHoveredIcon(null)}
                                className="flex h-5 w-5 items-center justify-center rounded text-[#999999] transition-colors hover:bg-[#333333] hover:text-[#FFFFFF] cursor-pointer"
                                aria-label="Open in GitHub"
                            >
                                <Icons.Github className="h-3 w-3" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Git PR Icon + Repo/PR Ref + Additions/Deletions + Branch */}
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight pt-0.5">
                        <Icons.GitPullRequest className="w-3 h-3 text-[#C084FC] shrink-0" />
                        <span className="truncate text-[#999999] font-normal">
                            {shortRepo}#{session.prNumber}
                        </span>
                        <span className="text-[#555555] select-none">•</span>
                        <span className="font-mono font-medium text-[#10B981] text-[11px]">
                            +{additions}
                        </span>
                        <span className="font-mono font-medium text-[#EF4444] text-[11px]">
                            -{deletions}
                        </span>
                        <span className="text-[#555555] select-none">•</span>
                        <span
                            className="truncate font-mono text-[10.5px] text-[#888888] max-w-[100px]"
                            title={branchName}
                        >
                            {branchName}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}
