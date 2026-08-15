import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Flag,
    MoreHorizontal,
    Pencil,
    Folder,
    Tag,
    Archive,
    ArchiveRestore,
    MessageSquare,
    TrendingUp,
    ChevronRight,
    Check,
    Pin,
    Plus,
} from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BadSessionModal } from './BadSessionModal'

import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'

import { sessionAPI } from '@/features/sessions/api/session'
import { Button } from '@/shared/components/ui/Button'
import { Icons } from '@/shared/components/ui/Icons'
import { Tooltip } from '@/shared/components/ui/Tooltip'
import { cn } from '@/shared/lib/utils'

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
}) => {
    const queryClient = useQueryClient()
    const [isBadSessionModalOpen, setIsBadSessionModalOpen] = useState(false)

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
    const [isFolderSubmenuOpen, setIsFolderSubmenuOpen] = useState(false)
    const [folders, setFolders] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('workspace_project_folders')
            return saved ? JSON.parse(saved) : ['project1']
        } catch {
            return ['project1']
        }
    })
    const [assignedFolder, setAssignedFolder] = useState<string | null>(() => {
        if (!projectId) return 'project1'
        const saved = localStorage.getItem(`session_folder_${projectId}`)
        return saved === '' ? null : (saved ?? 'project1')
    })
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')

    const moreMenuRef = React.useRef<HTMLDivElement | null>(null)
    const folderCloseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handleFolderMouseEnter = () => {
        if (folderCloseTimeoutRef.current) {
            clearTimeout(folderCloseTimeoutRef.current)
            folderCloseTimeoutRef.current = null
        }
        setIsFolderSubmenuOpen(true)
    }

    const handleFolderMouseLeave = () => {
        if (folderCloseTimeoutRef.current) {
            clearTimeout(folderCloseTimeoutRef.current)
        }
        folderCloseTimeoutRef.current = setTimeout(() => {
            setIsFolderSubmenuOpen(false)
        }, 150)
    }

    // Keep assignedFolder in sync when projectId changes
    React.useEffect(() => {
        if (projectId) {
            const saved = localStorage.getItem(`session_folder_${projectId}`)
            if (saved !== null) {
                setAssignedFolder(saved === '' ? null : saved)
            } else {
                setAssignedFolder('project1')
            }
        }
    }, [projectId])

    // Fetch session details for archive status
    const { data: sessionData } = useQuery({
        queryKey: ['session', projectId],
        queryFn: () => (projectId ? sessionAPI.getSession(projectId) : null),
        enabled: Boolean(projectId),
        staleTime: 5000,
    })

    const isArchived = Boolean((sessionData as any)?.isArchived)

    const [isPillFolderOpen, setIsPillFolderOpen] = useState(false)
    const pillFolderRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false)
                setIsFolderSubmenuOpen(false)
                setIsCreatingFolder(false)
            }
            if (pillFolderRef.current && !pillFolderRef.current.contains(event.target as Node)) {
                setIsPillFolderOpen(false)
            }
        }
        if (isMoreMenuOpen || isPillFolderOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMoreMenuOpen, isPillFolderOpen])

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

    const navigate = useNavigate()
    const prNumberDisplay = activeVersionId ? `#${activeVersionId.slice(0, 4)}` : '#97'
    const prTitle = projectName
        ? `feat(workspace): ${projectName}`
        : 'feat(tui): restyle TUI in Devin CLI style with D...'

    const handleOpenReview = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setIsPrTooltipOpen(false)
        const prNum = activeVersionId ? activeVersionId.slice(0, 4) : '97'
        const params = new URLSearchParams()
        params.set('pr', prNum)
        if (projectId) params.set('session', projectId)
        navigate(`/review?${params.toString()}`)
    }

    const handleCopyBranch = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const branch = 'devin-ai-integration/restyle-tui'
        navigator.clipboard.writeText(branch)
        setIsCopiedBranch(true)
        setTimeout(() => setIsCopiedBranch(false), 2000)
    }

    const handleOpenGithub = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        const prNum = activeVersionId ? activeVersionId.slice(0, 4) : '97'
        const url = `https://github.com/december-ai/december/pull/${prNum}`
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

    const handleAssignFolder = (folderName: string | null) => {
        setAssignedFolder(folderName)
        if (projectId) {
            if (folderName) {
                localStorage.setItem(`session_folder_${projectId}`, folderName)
            } else {
                localStorage.setItem(`session_folder_${projectId}`, '')
            }
        }
        setIsMoreMenuOpen(false)
        setIsFolderSubmenuOpen(false)
    }

    const handleCreateFolder = (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = newFolderName.trim()
        if (trimmed) {
            if (!folders.includes(trimmed)) {
                const next = [...folders, trimmed]
                setFolders(next)
                try {
                    localStorage.setItem('workspace_project_folders', JSON.stringify(next))
                } catch (err) {
                    console.error(err)
                }
            }
            handleAssignFolder(trimmed)
        }
        setNewFolderName('')
        setIsCreatingFolder(false)
    }

    const versionDisplay = activeVersionId ? `#${activeVersionId.slice(0, 4)}` : '#97'

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
                id: 'folder',
                label: 'Folder',
                icon: <Folder className="w-3.5 h-3.5" />,
                hasSubmenu: true,
                isFolder: true,
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
                id: isArchived ? 'unarchive' : 'archive',
                label: isArchived ? 'Unarchive' : 'Archive',
                icon: isArchived ? (
                    <ArchiveRestore className="w-3.5 h-3.5" />
                ) : (
                    <Archive className="w-3.5 h-3.5" />
                ),
                action: () => handleToggleArchive(),
            },
            {
                id: 'more',
                label: 'More',
                icon: <MoreHorizontal className="w-3.5 h-3.5" />,
                hasSubmenu: true,
            },
        ],
        [isArchived, onStartRename, onOpenTagsModal, handleToggleArchive]
    )

    const renderFolderContent = () => (
        <>
            {folders.map((f) => (
                <button
                    key={f}
                    type="button"
                    onClick={() => {
                        handleAssignFolder(assignedFolder === f ? null : f)
                        setIsPillFolderOpen(false)
                        setIsFolderSubmenuOpen(false)
                    }}
                    className={cn(
                        'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer',
                        assignedFolder === f
                            ? 'bg-white/10 text-white'
                            : 'text-[#EDEDEF] hover:bg-white/5 hover:text-white'
                    )}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                        <span className="truncate">{f}</span>
                    </div>
                    {assignedFolder === f && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                </button>
            ))}

            <button
                type="button"
                onClick={() => {
                    handleAssignFolder(assignedFolder === 'Pinned' ? null : 'Pinned')
                    setIsPillFolderOpen(false)
                    setIsFolderSubmenuOpen(false)
                }}
                className={cn(
                    'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer',
                    assignedFolder === 'Pinned'
                        ? 'bg-white/10 text-white'
                        : 'text-[#EDEDEF] hover:bg-white/5 hover:text-white'
                )}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <Pin className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                    <span className="truncate">Pinned</span>
                </div>
                {assignedFolder === 'Pinned' && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
            </button>

            <div className="h-[1px] bg-[#272727] my-1" />

            {isCreatingFolder ? (
                <form
                    onSubmit={(e) => {
                        handleCreateFolder(e)
                        setIsPillFolderOpen(false)
                    }}
                    className="px-1 py-0.5"
                >
                    <input
                        type="text"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        className="w-full bg-[#141414] border border-[#87B2F4] rounded-md px-2 py-1 text-xs text-white placeholder-[#71717A] outline-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setIsCreatingFolder(false)
                        }}
                    />
                </form>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsCreatingFolder(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                    <span>New folder</span>
                </button>
            )}

            <button
                type="button"
                onClick={() => {
                    handleAssignFolder(null)
                    setIsPillFolderOpen(false)
                    setIsFolderSubmenuOpen(false)
                }}
                disabled={!assignedFolder}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#71717A] hover:text-[#EDEDEF] disabled:opacity-40 disabled:pointer-events-none hover:bg-white/5 transition-colors text-left outline-none cursor-pointer"
            >
                <span>Remove from folder</span>
            </button>
        </>
    )

    return (
        <div className="flex items-center gap-1 relative">
            {/* Archived Pill */}
            {isArchived && (
                <div
                    onClick={handleToggleArchive}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#202020] hover:bg-[#282828] border border-white/5 text-[11.5px] font-medium text-[#EDEDED] transition-colors cursor-pointer select-none mr-0.5"
                    title="Session is archived. Click to unarchive."
                >
                    <svg
                        className="w-3 h-3 text-[#EDEDED]"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            d="M2.5 10v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M8 9.5V3M5 6l3-3 3 3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span>Archived</span>
                </div>
            )}

            {/* Folder Pill */}
            {assignedFolder && (
                <div className="relative" ref={pillFolderRef}>
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsPillFolderOpen(!isPillFolderOpen)
                            setIsMoreMenuOpen(false)
                        }}
                        className={cn(
                            'hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/5 text-[11.5px] font-medium transition-colors cursor-pointer select-none mr-0.5',
                            isPillFolderOpen
                                ? 'bg-[#282828] text-white'
                                : 'bg-[#202020] hover:bg-[#282828] text-[#EDEDED]'
                        )}
                        title={`Folder: ${assignedFolder}. Click to change folder.`}
                    >
                        <svg
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            className="w-3.5 h-3.5 text-[#EDEDED] shrink-0"
                        >
                            <path
                                d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 5H12.5A1.5 1.5 0 0 1 14 6.5v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-8z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span className="truncate max-w-[120px]">{assignedFolder}</span>
                    </div>

                    {isPillFolderOpen && (
                        <div
                            className="absolute left-0 top-full mt-1.5 w-[185px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 font-sans z-[60] animate-in fade-in zoom-in-95 duration-100 select-none"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {renderFolderContent()}
                        </div>
                    )}
                </div>
            )}

            {/* 2. PR Tag Badge with Hover Info Card */}
            <div
                className="hidden lg:flex items-center mx-0.5 relative"
                onMouseEnter={handlePrMouseEnter}
                onMouseLeave={handlePrMouseLeave}
            >
                <div
                    onClick={handleOpenGithub}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1A22] border border-[#2E2838] text-[11px] font-mono text-[#C084FC] hover:bg-[#252030] hover:border-[#3E344A] transition-colors cursor-pointer select-none"
                    title={`Open Pull Request ${versionDisplay} in GitHub`}
                >
                    <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        className="w-3.5 h-3.5 text-[#C084FC]"
                    >
                        <circle cx="5" cy="4" r="1.5" />
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="11" cy="6" r="1.5" />
                        <path
                            d="M5 5.5v5M11 7.5v1.5a3 3 0 0 1-3 3H6.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span className="font-medium tracking-tight text-[#C084FC]">
                        {versionDisplay}
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

                        {/* Bottom Row: Git PR Icon + Repo/PR Ref + Additions/Deletions + Branch */}
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight pt-0.5">
                            <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.3"
                                className="w-3 h-3 text-[#C084FC] shrink-0"
                            >
                                <circle cx="5" cy="4" r="1.5" />
                                <circle cx="5" cy="12" r="1.5" />
                                <circle cx="11" cy="6" r="1.5" />
                                <path
                                    d="M5 5.5v5M11 7.5v1.5a3 3 0 0 1-3 3H6.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span className="truncate text-[#999999] font-normal">
                                ...ember{versionDisplay}
                            </span>
                            <span className="text-[#555555] select-none">•</span>
                            <span className="font-mono font-medium text-[#10B981] text-[11px]">
                                +220
                            </span>
                            <span className="font-mono font-medium text-[#EF4444] text-[11px]">
                                -82
                            </span>
                            <span className="text-[#555555] select-none">•</span>
                            <span
                                className="truncate font-mono text-[10.5px] text-[#888888] max-w-[100px]"
                                title="devin-ai-integration"
                            >
                                devin-ai-integration...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. Flag */}
            <Tooltip content="Report issue" position="bottom">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBadSessionModalOpen(true)}
                    className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer ${isBadSessionModalOpen ? 'text-white bg-white/5' : ''}`}
                >
                    <Flag size={16} />
                </Button>
            </Tooltip>

            {/* 4. 3 dots */}
            <div className="relative" ref={moreMenuRef}>
                <Tooltip content="More options" position="bottom" align="end">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setIsMoreMenuOpen(!isMoreMenuOpen)
                            setIsFolderSubmenuOpen(false)
                        }}
                        className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer ${isMoreMenuOpen ? 'text-white bg-white/5' : ''}`}
                    >
                        <MoreHorizontal size={16} />
                    </Button>
                </Tooltip>

                {isMoreMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[230px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl z-50 p-1.5 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 select-none">
                        {/* Top Action Items */}
                        <div className="flex flex-col gap-0.5 relative">
                            {menuItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="relative"
                                    onMouseEnter={() => {
                                        if (item.isFolder) {
                                            handleFolderMouseEnter()
                                        } else {
                                            setIsFolderSubmenuOpen(false)
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        if (item.isFolder) {
                                            handleFolderMouseLeave()
                                        }
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (item.isFolder) {
                                                setIsFolderSubmenuOpen(!isFolderSubmenuOpen)
                                                return
                                            }
                                            item.action?.()
                                        }}
                                        className={cn(
                                            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left outline-none cursor-pointer',
                                            item.isFolder && isFolderSubmenuOpen
                                                ? 'bg-white/10 text-white'
                                                : 'text-[#EDEDEF] hover:bg-white/5 hover:text-white'
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-[#8E8D8C] shrink-0">
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {item.hasSubmenu && (
                                            <ChevronRight className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                                        )}
                                    </button>

                                    {/* Folder Flyout Submenu on the Left with hover bridge */}
                                    {item.isFolder && isFolderSubmenuOpen && (
                                        <div
                                            className="absolute right-full top-0 mr-1.5 w-[185px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 font-sans z-[60] animate-in fade-in zoom-in-95 duration-100 select-none before:content-[''] before:absolute before:-right-3 before:top-0 before:bottom-0 before:w-3"
                                            onMouseEnter={handleFolderMouseEnter}
                                            onMouseLeave={handleFolderMouseLeave}
                                        >
                                            {renderFolderContent()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#272727] my-1.5" />

                        {/* Feedback Section */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsMoreMenuOpen(false)
                                setIsBadSessionModalOpen(true)
                            }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                            <span>Give feedback</span>
                        </button>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#272727] my-1.5" />

                        {/* Usage & Insights Section */}
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                <span>Session insights</span>
                            </button>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-1.5 pt-1.5 px-2.5 flex flex-col gap-1 text-[11px] text-[#8E8D8C] border-t border-[#272727]/60">
                            <div className="flex items-center justify-between">
                                <span>On-demand usage:</span>
                                <span className="text-[#EDEDEF] font-semibold">$10.13</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>User messages:</span>
                                <span className="text-[#EDEDEF] font-semibold">5</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Session size:</span>
                                <span className="text-[#EDEDEF] font-semibold">M</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Platform:</span>
                                <span className="text-[#EDEDEF] font-semibold">Linux</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Sidebar close */}
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

            {/* Bad Session Feedback Modal */}
            <BadSessionModal
                isOpen={isBadSessionModalOpen}
                onClose={() => setIsBadSessionModalOpen(false)}
                sessionId={projectId}
                projectName={projectName}
            />
        </div>
    )
}

export const OutputHeaderActions = WorkspaceHeaderActions
