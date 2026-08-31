import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    MoreHorizontal,
    Pencil,
    Tag,
    Archive,
    ArchiveRestore,
    TrendingUp,
    Download,
} from 'lucide-react'
import React, { useState } from 'react'

import type { BackendProjectVersionSummary } from '@/features/sessions/api/session'

import { sessionAPI } from '@/features/sessions/api/session'
import { SessionInsightsModal } from '@/features/sessions/components/SessionInsightsModal'
import { Button } from '@/shared/components/ui/Button'
import { Icons } from '@/shared/components/ui/Icons'
import { Tooltip } from '@/shared/components/ui/Tooltip'

interface WorkspaceHeaderActionsProps {
    projectName?: string | null
    projectId?: string | null
    versions?: BackendProjectVersionSummary[]
    activeVersionId?: string | null
    isVersionLoading?: boolean
    onSelectVersion?: (versionId: string) => void
    onDownload?: () => void
    isSidebarCollapsed?: boolean
    onToggleSidebar?: () => void
    isPreviewCollapsed?: boolean
    onTogglePreview?: () => void
    onStartRename?: () => void
    onOpenTagsModal?: () => void
}

export const WorkspaceHeaderActions: React.FC<WorkspaceHeaderActionsProps> = ({
    projectName,
    projectId,
    activeVersionId,
    isPreviewCollapsed,
    onTogglePreview,
    onStartRename,
    onOpenTagsModal,
    onDownload,
}) => {
    const queryClient = useQueryClient()
    const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false)
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
    const moreMenuRef = React.useRef<HTMLDivElement | null>(null)

    // Fetch session details for archive status and stats
    const { data: sessionData } = useQuery({
        queryKey: ['session', projectId],
        queryFn: () => (projectId ? sessionAPI.getSession(projectId) : null),
        enabled: Boolean(projectId),
        staleTime: 5000,
    })

    const isArchived = Boolean((sessionData as any)?.isArchived)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false)
            }
        }
        if (isMoreMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMoreMenuOpen])

    const [isPrTooltipOpen, setIsPrTooltipOpen] = useState(false)
    const [isCopiedBranch, setIsCopiedBranch] = useState(false)
    const [hoveredPrIcon, setHoveredPrIcon] = useState<'copy' | 'github' | null>(null)
    const prTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handlePrMouseEnter = () => {
        if (prTimeoutRef.current) clearTimeout(prTimeoutRef.current)
        setIsPrTooltipOpen(true)
    }

    const handlePrMouseLeave = () => {
        prTimeoutRef.current = setTimeout(() => {
            setIsPrTooltipOpen(false)
            setHoveredPrIcon(null)
        }, 150)
    }

    const prNumber = (sessionData as any)?.prNumber
    const prState = (sessionData as any)?.prState
    const githubRepoUrl = (sessionData as any)?.githubRepoUrl
    const hasPr = Boolean(prNumber != null || githubRepoUrl)
    const prNumberDisplay =
        prNumber != null
            ? `#${prNumber}`
            : activeVersionId
              ? `#${activeVersionId.slice(0, 4)}`
              : '#1'
    const prBadgeTitle =
        prNumber != null
            ? `Open Pull Request #${prNumber} in GitHub`
            : `Open Pull Request ${prNumberDisplay} in GitHub`
    const prTitle = projectName ? `feat(workspace): ${projectName}` : 'Workspace Project'
    const branchName = projectName
        ? `feature/${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : 'main'

    const handleCopyBranch = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        navigator.clipboard.writeText(branchName)
        setIsCopiedBranch(true)
        setTimeout(() => setIsCopiedBranch(false), 2000)
    }

    const handleOpenGithub = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        if (githubRepoUrl && prNumber != null) {
            const base = githubRepoUrl.endsWith('/') ? githubRepoUrl.slice(0, -1) : githubRepoUrl
            window.open(`${base}/pull/${prNumber}`, '_blank', 'noopener,noreferrer')
            return
        }
        const prNum =
            prNumber != null ? prNumber : activeVersionId ? activeVersionId.slice(0, 4) : '1'
        const url = `https://github.com/phasehumans/december/pull/${prNum}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleToggleArchive = React.useCallback(async () => {
        if (!projectId) return
        setIsMoreMenuOpen(false)
        const nextArchived = !isArchived

        // Optimistically update React Query cache immediately
        queryClient.setQueryData(['session', projectId], (old: any) =>
            old ? { ...old, isArchived: nextArchived } : { id: projectId, isArchived: nextArchived }
        )
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) =>
                    s && s.id === projectId ? { ...s, isArchived: nextArchived } : s
                )
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s && s.id === projectId ? { ...s, isArchived: nextArchived } : s
                    ),
                }
            }
            return old
        })

        try {
            if (isArchived) {
                await sessionAPI.unarchiveSession(projectId)
            } else {
                await sessionAPI.archiveSession(projectId)
            }
        } catch (err) {
            console.error('Failed to toggle archive', err)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['session', projectId] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
    }, [isArchived, projectId, queryClient])

    const menuItems = React.useMemo(
        () => [
            {
                id: 'rename',
                label: 'Rename',
                icon: <Pencil className="w-3.5 h-3.5" />,
                action: () => {
                    setIsMoreMenuOpen(false)
                    onStartRename?.()
                },
            },
            {
                id: 'edit_tags',
                label: 'Edit tags',
                icon: <Tag className="w-3.5 h-3.5" />,
                action: () => {
                    setIsMoreMenuOpen(false)
                    onOpenTagsModal?.()
                },
            },
            {
                id: 'download',
                label: 'Download ZIP',
                icon: <Download className="w-3.5 h-3.5" />,
                action: () => {
                    setIsMoreMenuOpen(false)
                    onDownload?.()
                },
            },
            {
                id: isArchived ? 'unarchive' : 'archive',
                label: isArchived ? 'Unarchive' : 'Archive',
                icon: isArchived ? (
                    <ArchiveRestore className="w-3.5 h-3.5" />
                ) : (
                    <Archive className="w-3.5 h-3.5" />
                ),
                action: () => handleToggleArchive(),
            },
        ],
        [isArchived, onStartRename, onOpenTagsModal, onDownload, handleToggleArchive]
    )

    return (
        <div className="flex items-center gap-1">
            {/* Archived indicator badge */}
            {isArchived && (
                <div
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2A1E17] border border-[#4A3222] text-[#F97316] text-[11.5px] font-medium select-none"
                    title="This session is archived"
                >
                    <Archive className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Archived</span>
                </div>
            )}

            {/* PR Tag Badge with Hover Info Card */}
            {hasPr && (
                <div
                    className="hidden lg:flex items-center mx-0.5 relative"
                    onMouseEnter={handlePrMouseEnter}
                    onMouseLeave={handlePrMouseLeave}
                >
                    <div
                        onClick={handleOpenGithub}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1A22] border border-[#2E2838] text-[11px] font-mono text-[#C084FC] hover:bg-[#252030] hover:border-[#3E344A] transition-colors cursor-pointer select-none"
                        title={prBadgeTitle}
                    >
                        <Icons.GitPullRequest className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span className="font-medium tracking-tight text-[#C084FC]">
                            {prNumberDisplay}
                        </span>
                    </div>

                    {/* PR Info Tooltip Popup */}
                    {isPrTooltipOpen && (
                        <div
                            className="absolute right-0 top-full mt-1.5 z-50 flex w-[300px] flex-col rounded-xl border border-[#2F2F2F] bg-[#1E1E1E] px-2.5 py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none font-sans"
                            onMouseEnter={handlePrMouseEnter}
                            onMouseLeave={handlePrMouseLeave}
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
                                    {hoveredPrIcon && (
                                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none z-50">
                                            <div className="rounded-md bg-[#181818] border border-[#333333] px-2 py-0.5 text-[10.5px] font-medium text-[#FFFFFF] shadow-xl whitespace-nowrap">
                                                {hoveredPrIcon === 'copy'
                                                    ? isCopiedBranch
                                                        ? 'Copied!'
                                                        : 'Copy branch name'
                                                    : 'Open in GitHub'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Copy Branch */}
                                    <button
                                        type="button"
                                        onClick={handleCopyBranch}
                                        onMouseEnter={() => setHoveredPrIcon('copy')}
                                        onMouseLeave={() => setHoveredPrIcon(null)}
                                        className={`flex h-5 w-5 items-center justify-center rounded text-[#999999] transition-colors hover:bg-[#333333] hover:text-[#FFFFFF] outline-none cursor-pointer ${
                                            isCopiedBranch ? 'bg-[#333333] text-emerald-400' : ''
                                        }`}
                                        aria-label="Copy branch name"
                                    >
                                        {isCopiedBranch ? (
                                            <Icons.Check className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                            <Icons.Copy className="h-3 w-3" />
                                        )}
                                    </button>

                                    {/* GitHub */}
                                    <button
                                        type="button"
                                        onClick={handleOpenGithub}
                                        onMouseEnter={() => setHoveredPrIcon('github')}
                                        onMouseLeave={() => setHoveredPrIcon(null)}
                                        className="flex h-5 w-5 items-center justify-center rounded text-[#999999] transition-colors hover:bg-[#333333] hover:text-[#FFFFFF] outline-none cursor-pointer"
                                        aria-label="Open in GitHub"
                                    >
                                        <Icons.Github className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Row: Git PR Icon + Repo/PR Ref + State + Branch */}
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight pt-0.5">
                                <Icons.GitPullRequest className="w-3 h-3 text-[#C084FC] shrink-0" />
                                <span className="truncate text-[#999999] font-normal">
                                    {prNumberDisplay}
                                </span>
                                {prState && (
                                    <>
                                        <span className="text-[#555555] select-none">•</span>
                                        <span className="font-medium text-[#10B981] text-[11px] capitalize">
                                            {prState}
                                        </span>
                                    </>
                                )}
                                <span className="text-[#555555] select-none">•</span>
                                <span
                                    className="truncate font-mono text-[10.5px] text-[#888888] max-w-[120px]"
                                    title={branchName}
                                >
                                    {branchName}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3 dots menu */}
            <div className="relative" ref={moreMenuRef}>
                <Tooltip content="More options" position="bottom" align="end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer ${isMoreMenuOpen ? 'text-white bg-white/5' : ''}`}
                    >
                        <MoreHorizontal size={16} />
                    </Button>
                </Tooltip>

                {isMoreMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[210px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl z-50 p-1.5 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 select-none">
                        {/* Top Action Items */}
                        <div className="flex flex-col gap-0.5 relative">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={item.action}
                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                                >
                                    <span className="text-[#8E8D8C] shrink-0">{item.icon}</span>
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#272727] my-1.5" />

                        {/* Usage & Insights Section */}
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMoreMenuOpen(false)
                                    setIsInsightsModalOpen(true)
                                }}
                                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                <span>Session insights</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar toggle */}
            {onTogglePreview && (
                <Button
                    variant="ghost"
                    size="icon"
                    title={isPreviewCollapsed ? 'Expand Preview Panel' : 'Collapse Preview Panel'}
                    onClick={onTogglePreview}
                    className="text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer group"
                >
                    <Icons.SidebarToggle className="w-4 h-4 text-[#91908F] group-hover:text-white" />
                </Button>
            )}

            {/* Session Insights Modal */}
            <SessionInsightsModal
                isOpen={isInsightsModalOpen}
                onClose={() => setIsInsightsModalOpen(false)}
                session={
                    sessionData ||
                    (projectId ? { id: projectId, title: projectName, projectName } : null)
                }
            />
        </div>
    )
}

export const OutputHeaderActions = WorkspaceHeaderActions
