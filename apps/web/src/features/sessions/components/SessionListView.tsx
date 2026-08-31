import React from 'react'

import { type SortOption } from './SessionList'
import { SessionListRow } from './SessionListRow'

import { ErrorAlert } from '@/shared/components/ui/ErrorAlert'
import { Icons } from '@/shared/components/ui/Icons'
import { Skeleton } from '@/shared/components/ui/Skeleton'

interface SessionListViewProps {
    projects: any[]
    onNewProject: () => void
    onOpenProject: (projectId: string) => void
    isInitialLoading: boolean
    isFetching: boolean
    errorMessage: string | null
    actionError: string | null
    menuOpenId: string | null
    isTogglePending: boolean
    onToggleStar: (id: string, event: React.MouseEvent) => void
    onToggleMenu: (id: string, event: React.MouseEvent) => void
    onOpenProjectFromMenu: (projectId: string, event: React.MouseEvent) => void
    onToggleStarFromMenu: (project: any, event: React.MouseEvent) => void
    onToggleArchiveFromMenu: (project: any, event: React.MouseEvent) => void
    onOpenRename: (project: any, event: React.MouseEvent) => void
    onOpenDelete: (project: any, event: React.MouseEvent) => void
    onOpenTags: (project: any, event: React.MouseEvent) => void
    onOpenInsights: (project: any, event: React.MouseEvent) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    sortOption: SortOption
    onSortChange: (option: SortOption) => void
    hasUnfilteredProjects: boolean
}

const SessionListAreaSkeleton: React.FC = () => {
    return (
        <div className="min-h-[420px] flex flex-col gap-2 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <React.Fragment key={`session-list-skeleton-${index}`}>
                    {/* Mobile skeleton card (< md): borderless, subtle muted background */}
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

                    {/* Desktop skeleton grid (>= md): borderless, matching exact row geometry */}
                    <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(100px,auto)_minmax(100px,auto)_minmax(150px,1fr)_minmax(100px,auto)_2.5rem] items-center gap-2 rounded-lg bg-white/[0.015] pl-1 pr-5 py-2.5 md:gap-3">
                        <div className="flex flex-1 items-center gap-3 min-w-0 pr-4">
                            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                                <Skeleton className="h-4 w-[60%] bg-white/[0.05]" />
                                <Skeleton className="h-3 w-[80%] bg-white/[0.03]" />
                            </div>
                        </div>
                        <div className="truncate pr-2">
                            <Skeleton className="h-3.5 w-12 bg-white/[0.03]" />
                        </div>
                        <div className="truncate pr-2">
                            <Skeleton className="h-3.5 w-12 bg-white/[0.03]" />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Skeleton className="h-4 w-14 rounded bg-white/[0.03]" />
                        </div>
                        <div className="truncate">
                            <Skeleton className="h-3.5 w-12 bg-white/[0.03]" />
                        </div>
                        <div className="flex justify-center">
                            <Skeleton className="h-6 w-6 rounded-lg bg-white/[0.03]" />
                        </div>
                    </div>
                </React.Fragment>
            ))}
        </div>
    )
}

const EmptySessionsState: React.FC = () => {
    return (
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

            <h2 className="text-[17px] font-medium text-[#D6D5C9]">No sessions</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#7B7A79]">
                Your recent sessions will appear here.
            </p>
        </div>
    )
}

const NoResultsState: React.FC = () => {
    return (
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
            <h2 className="text-[17px] font-medium text-[#D6D5C9]">No Sessions Found</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#7B7A79]">
                Try adjusting your search or filters.
            </p>
        </div>
    )
}

const SORT_LABELS: Record<SortOption, string> = {
    newest: 'Newest',
    oldest: 'Oldest',
}

export const SessionListView: React.FC<SessionListViewProps> = ({
    projects: sessions,
    onNewProject,
    onOpenProject,
    isInitialLoading,
    isFetching,
    errorMessage,
    actionError,
    menuOpenId,
    isTogglePending,
    onToggleStar,
    onToggleMenu,
    onOpenProjectFromMenu,
    onToggleStarFromMenu,
    onToggleArchiveFromMenu,
    onOpenRename,
    onOpenDuplicate,
    onOpenDelete,
    onOpenTags,
    onOpenInsights,
    searchQuery,
    onSearchChange,
    sortOption,
    onSortChange,
    hasUnfilteredProjects: hasUnfilteredSessions,
}) => {
    const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
    const [dropdownDirection, setDropdownDirection] = React.useState<'down' | 'up'>('down')
    const [visibleCount, setVisibleCount] = React.useState(20)
    const sortDropdownRef = React.useRef<HTMLDivElement>(null)

    const toggleDropdown = (type: string, event: React.MouseEvent<HTMLButtonElement>) => {
        if (activeDropdown === type) {
            setActiveDropdown(null)
            return
        }
        const rect = event.currentTarget.getBoundingClientRect()
        if (window.innerHeight - rect.bottom < 250 && rect.top > 250) {
            setDropdownDirection('up')
        } else {
            setDropdownDirection('down')
        }
        setActiveDropdown(type)
    }

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                sortDropdownRef.current &&
                !sortDropdownRef.current.contains(event.target as Node)
            ) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    React.useEffect(() => {
        setVisibleCount(20)
    }, [sessions.length])

    const displayedError = actionError ?? errorMessage
    const hasSessions = sessions.length > 0

    return (
        <>
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex flex-col">
                    <h1 className="text-[24px] font-medium text-[#D6D5C9] mb-1">Sessions</h1>
                    <p className="text-[13px] text-[#7B7A79]">Manage and view all your sessions.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {isFetching && !isInitialLoading && (
                        <div className="text-[12px] text-neutral-500 mt-1">Syncing...</div>
                    )}
                    {displayedError && (
                        <div className="mt-1 w-full flex justify-end">
                            <ErrorAlert message={displayedError} />
                        </div>
                    )}
                </div>
            </div>

            <div className="relative z-10 mb-4 flex w-full items-center gap-2">
                <div className="relative flex-1 max-w-full md:max-w-[320px]">
                    <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B7A79]" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full rounded-lg border border-[#282828] bg-[#202020] py-1.5 pl-9 pr-4 text-[13px] text-[#949494] transition-colors placeholder:text-[#949494] hover:bg-[#282828] focus:border-[#7B7A79] focus:bg-[#202020] focus:outline-none"
                    />
                </div>

                <div className="hidden md:flex flex-1" />

                <div className="flex items-center gap-2 shrink-0">
                    {/* sort dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                        <button
                            onClick={(e) => toggleDropdown('sort', e)}
                            className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-[#282828] bg-[#202020] px-2.5 sm:px-4 py-1.5 text-[12px] sm:text-[13px] text-[#949494] transition-colors hover:bg-[#282828]"
                        >
                            <span className="hidden sm:inline">Sort:</span>{' '}
                            {SORT_LABELS[sortOption]}{' '}
                            <Icons.ChevronDown className="h-3.5 w-3.5 text-[#7B7A79]" />
                        </button>
                        {activeDropdown === 'sort' && (
                            <div
                                className={`absolute right-0 ${dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 w-48 rounded-xl border border-[#383736] bg-[#1E1E1E] py-2 shadow-xl`}
                            >
                                <div className="mb-1 border-b border-[#383736] px-3 pb-2 text-[12px] font-medium text-[#7B7A79]">
                                    Sort by
                                </div>
                                <button
                                    onClick={() => {
                                        onSortChange('newest')
                                        setActiveDropdown(null)
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-[#D6D5C9] hover:bg-[#242323]"
                                >
                                    Newest first{' '}
                                    {sortOption === 'newest' && <Icons.Check className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => {
                                        onSortChange('oldest')
                                        setActiveDropdown(null)
                                    }}
                                    className="flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-[#D6D5C9] hover:bg-[#242323]"
                                >
                                    Oldest first{' '}
                                    {sortOption === 'oldest' && <Icons.Check className="h-4 w-4" />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isInitialLoading ? (
                <SessionListAreaSkeleton />
            ) : !hasUnfilteredSessions ? (
                <EmptySessionsState />
            ) : !hasSessions ? (
                <NoResultsState />
            ) : (
                <div className="flex flex-col h-full">
                    <div className="pb-4">
                        <div className="flex flex-col gap-1">
                            {sessions.slice(0, visibleCount).map((session) => (
                                <SessionListRow
                                    key={session.id}
                                    project={session}
                                    isMenuOpen={menuOpenId === session.id}
                                    isTogglePending={isTogglePending}
                                    onOpenProject={onOpenProject}
                                    onToggleStar={onToggleStar}
                                    onToggleMenu={onToggleMenu}
                                    onOpenProjectFromMenu={onOpenProjectFromMenu}
                                    onToggleStarFromMenu={onToggleStarFromMenu}
                                    onToggleArchiveFromMenu={onToggleArchiveFromMenu}
                                    onOpenRename={onOpenRename}
                                    onOpenDelete={onOpenDelete}
                                    onOpenTags={onOpenTags}
                                    onOpenInsights={onOpenInsights}
                                />
                            ))}
                        </div>
                    </div>

                    {visibleCount < sessions.length && (
                        <div className="flex justify-center pt-2 mb-8">
                            <button
                                onClick={() =>
                                    setVisibleCount((prev) => Math.min(prev + 20, sessions.length))
                                }
                                className="px-5 py-2 rounded-lg border border-[#383736] bg-[#141414] text-[13px] font-medium text-[#D6D5C9] hover:bg-[#242323] hover:text-white transition-all active:scale-95"
                            >
                                Load more
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
