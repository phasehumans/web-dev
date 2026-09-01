import { History } from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

import { SearchModal } from './SearchModal'
import { SidebarFooter } from './SidebarFooter'

import type { MobileSidebarProps } from '@/features/navigation/types'

import { useSessions } from '@/features/sessions/hooks/useSessions'
import { Icons } from '@/shared/components/ui/Icons'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/lib/utils'

const SidebarSessionsSkeleton: React.FC = () => (
    <div className="flex flex-col gap-0.5 px-1 py-1">
        {[
            { titleW: 'w-[75%]', timeW: 'w-12' },
            { titleW: 'w-[60%]', timeW: 'w-16' },
            { titleW: 'w-[85%]', timeW: 'w-10' },
            { titleW: 'w-[50%]', timeW: 'w-14' },
            { titleW: 'w-[68%]', timeW: 'w-12' },
            { titleW: 'w-[80%]', timeW: 'w-16' },
            { titleW: 'w-[55%]', timeW: 'w-10' },
        ].map((item, i) => (
            <div key={i} className="flex flex-col gap-1 px-2.5 py-1.5 rounded-xl">
                <Skeleton className={`h-3 ${item.titleW} bg-white/[0.04] rounded`} />
                <Skeleton className={`h-2.5 ${item.timeW} bg-white/[0.02] rounded`} />
            </div>
        ))}
    </div>
)

export const MobileSidebar: React.FC<
    MobileSidebarProps & { onSignOut?: () => void; onHomeClick?: () => void; user?: any }
> = ({
    isOpen,
    onClose,
    onNewThread,
    onAllProjects,
    onSessions = () => {},
    onProfile,
    onOpenProject,
    isAuthenticated,
    onOpenAuth,
    onSignOut,
    onHomeClick,
    user,
}) => {
    const { data: sessionsData, isLoading: isSessionsLoading } = useSessions()
    const sessions = React.useMemo(() => sessionsData?.sessions || [], [sessionsData?.sessions])
    const location = useLocation()
    const path = location.pathname

    const isHomeActive = path === '/'
    const isProjectsActive =
        path.startsWith('/projects') ||
        path.startsWith('/all-projects') ||
        path.startsWith('/sessions')
    const isSettingsActive =
        path.startsWith('/settings') ||
        path.startsWith('/profile') ||
        path.startsWith('/integrations') ||
        path.startsWith('/connections') ||
        path.startsWith('/connectors')

    const [isSearchOpen, setIsSearchOpen] = React.useState(false)
    const [isRecentMenuOpen, setIsRecentMenuOpen] = React.useState(false)
    const [recentMenuPos, setRecentMenuPos] = React.useState<{ top: number; left: number } | null>(
        null
    )
    const [sortBy, setSortBy] = React.useState<'created' | 'updated'>('updated')
    const [filterArchived, setFilterArchived] = React.useState(false)
    const [sessionType, setSessionType] = React.useState<'all' | 'agent' | 'search'>('all')
    const recentMenuRef = React.useRef<HTMLDivElement | null>(null)
    const recentMenuTriggerRef = React.useRef<HTMLButtonElement | null>(null)

    let activeIndex = 0
    if (isSearchOpen) {
        activeIndex = 1
    } else if (!isHomeActive) {
        if (isProjectsActive) activeIndex = 2
        else if (isSettingsActive) activeIndex = 3
    } else {
        activeIndex = 0
    }

    const navItems = [
        {
            id: 'new',
            label: 'New',
            icon: (
                <div className="w-[20px] h-[20px] rounded-full bg-[#333333] flex items-center justify-center shrink-0">
                    <Icons.Plus className="w-3 h-3 text-[#E8E8E8]" strokeWidth={2.5} />
                </div>
            ),
            onClick: () => {
                if (onNewThread) {
                    onNewThread()
                } else {
                    const el = document.getElementById('main-scroll-container')
                    el?.scrollTo({ top: 0, behavior: 'smooth' })
                    if (onHomeClick) onHomeClick()
                }
                onClose()
            },
        },
        {
            id: 'search',
            label: 'Search',
            icon: <Icons.Search className="w-[18px] h-[18px]" />,
            onClick: () => {
                if (isAuthenticated) {
                    setIsSearchOpen(true)
                } else {
                    if (onOpenAuth) onOpenAuth()
                }
                onClose()
            },
        },
        {
            id: 'sessions',
            label: 'Sessions',
            icon: <Icons.Folder className="w-[18px] h-[18px]" />,
            onClick: () => {
                onSessions()
                onClose()
            },
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Icons.Settings className="w-[18px] h-[18px]" />,
            onClick: () => {
                onProfile()
                onClose()
            },
        },
    ]

    React.useEffect(() => {
        if (!isRecentMenuOpen) return
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null
            if (
                recentMenuRef.current &&
                !recentMenuRef.current.contains(target) &&
                recentMenuTriggerRef.current &&
                !recentMenuTriggerRef.current.contains(target)
            ) {
                setIsRecentMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('touchstart', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('touchstart', handleOutsideClick)
        }
    }, [isRecentMenuOpen])

    const formatRelativeTime = (isoString?: string) => {
        if (!isoString) return 'just now'
        const date = new Date(isoString)
        if (isNaN(date.getTime())) return 'just now'
        const diff = Math.max(0, Date.now() - date.getTime())
        const mins = Math.floor(diff / (1000 * 60))
        if (mins < 1) return 'just now'
        if (mins < 60) return `${mins}m ago`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    const recentProjects = React.useMemo(() => {
        if (!isAuthenticated) return []

        const sourceList = (sessions || []).map((s) => ({
            id: s.id,
            title: s.title || s.projectName || 'Untitled Session',
            projectName: s.projectName,
            updatedAt: s.updatedAt,
            createdAt: s.createdAt,
            isArchived: Boolean(s.isArchived),
            type: s.type || 'WEB',
            prNumber: s.prNumber,
        }))

        return sourceList
            .filter((item) => {
                if (!filterArchived && item.isArchived) {
                    return false
                }
                if (sessionType === 'agent' && item.type === 'SEARCH') {
                    return false
                }
                if (sessionType === 'search' && item.type !== 'SEARCH') {
                    return false
                }
                return true
            })
            .sort((a, b) => {
                const timeA = new Date(a.createdAt).getTime() || 0
                const timeB = new Date(b.createdAt).getTime() || 0
                const updatedA = new Date(a.updatedAt).getTime() || 0
                const updatedB = new Date(b.updatedAt).getTime() || 0

                if (sortBy === 'created') {
                    return timeB - timeA
                }
                return updatedB - updatedA
            })
            .slice(0, 7)
    }, [isAuthenticated, sessions, sortBy, filterArchived, sessionType])

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    'fixed inset-y-0 left-0 w-[240px] bg-sidebar border-r border-white/5 z-[60] md:hidden flex flex-col pt-2 pb-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform',
                    isOpen
                        ? 'translate-x-0 pointer-events-auto'
                        : '-translate-x-full pointer-events-none'
                )}
            >
                {/* header & nav items */}
                <div className="px-3 mb-2 mt-0 z-30 relative">
                    <div className="flex items-center justify-between px-2 mb-6 mt-4">
                        <Icons.DecemberLogo className="w-6 h-6 text-[#D6D5D4]" />
                        <div
                            className="flex items-center justify-center text-[#919191] hover:text-[#D4D4D8] group/collapse p-1 rounded-md hover:bg-[#252525] transition-colors cursor-pointer relative"
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose()
                            }}
                        >
                            <Icons.SidebarToggle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-[1px] relative">
                        {navItems.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                className={cn(
                                    'relative flex items-center justify-between w-full px-2.5 h-[32px] rounded-[10px] transition-all group outline-none',
                                    activeIndex === idx ? 'bg-[#1F1F1F]' : 'hover:bg-[#1C1C1C]'
                                )}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={cn(
                                            'transition-colors flex items-center justify-center shrink-0',
                                            activeIndex === idx
                                                ? 'text-[#D6D5D4]'
                                                : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                        )}
                                    >
                                        {item.icon}
                                    </div>
                                    <span
                                        className={cn(
                                            'font-medium text-[14px] tracking-wide transition-colors truncate',
                                            activeIndex === idx
                                                ? 'text-[#D6D5D4]'
                                                : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col mt-2 mb-2 font-sans px-3 min-h-0">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-2.5 py-1.5 w-full text-left group shrink-0 z-10">
                            <div className="flex items-center gap-1.5 text-[#919191]">
                                <History className="w-3.5 h-3.5" strokeWidth={2.5} />
                                <span className="font-medium text-[12px] whitespace-nowrap transition-colors tracking-tight">
                                    Recent
                                </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <div className="relative">
                                    <button
                                        ref={recentMenuTriggerRef}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!isAuthenticated) {
                                                onOpenAuth?.()
                                                onClose()
                                            } else {
                                                if (!isRecentMenuOpen) {
                                                    const rect =
                                                        e.currentTarget.getBoundingClientRect()
                                                    const menuWidth = 180
                                                    const left = Math.max(
                                                        10,
                                                        Math.min(
                                                            rect.right - menuWidth,
                                                            window.innerWidth - menuWidth - 10
                                                        )
                                                    )
                                                    const top = Math.min(
                                                        rect.bottom + 4,
                                                        window.innerHeight - 340
                                                    )
                                                    setRecentMenuPos({
                                                        top,
                                                        left,
                                                    })
                                                }
                                                setIsRecentMenuOpen(!isRecentMenuOpen)
                                            }
                                        }}
                                        className="relative flex items-center justify-center p-1 rounded-md text-[#919191] hover:text-[#E8E8E8] hover:bg-[#252525] transition-all outline-none group/btn"
                                    >
                                        <Icons.MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                    {isRecentMenuOpen &&
                                        recentMenuPos &&
                                        typeof document !== 'undefined' &&
                                        createPortal(
                                            <div
                                                ref={recentMenuRef}
                                                className="fixed z-[200] w-[180px] rounded-xl border border-[#2E2D2C] bg-[#1E1E1E] shadow-2xl p-1 flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                                style={{
                                                    top: recentMenuPos.top,
                                                    left: recentMenuPos.left,
                                                }}
                                            >
                                                <div className="px-2.5 py-1 text-[11.5px] font-medium text-[#8F8E8D]">
                                                    Sort by
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSortBy('created')
                                                    }}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Created time</span>
                                                    {sortBy === 'created' && (
                                                        <Icons.Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSortBy('updated')
                                                    }}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Last updated</span>
                                                    {sortBy === 'updated' && (
                                                        <Icons.Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </button>

                                                <div className="h-[1px] bg-[#2B2A29] mx-1 my-1" />

                                                <div className="px-2.5 py-1 text-[11.5px] font-medium text-[#8F8E8D]">
                                                    Filter
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setFilterArchived(!filterArchived)
                                                    }
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Archived</span>
                                                    <div
                                                        className={`w-7 h-[14px] rounded-full flex items-center px-[2px] transition-colors ${filterArchived ? 'bg-[#87B2F4]' : 'bg-[#333333]'}`}
                                                    >
                                                        <div
                                                            className={`w-[10px] h-[10px] rounded-full bg-white transition-transform ${filterArchived ? 'translate-x-[14px]' : 'translate-x-0'}`}
                                                        />
                                                    </div>
                                                </button>

                                                <div className="h-[1px] bg-[#2B2A29] mx-1 my-1" />

                                                <div className="px-2.5 py-1 text-[11.5px] font-medium text-[#8F8E8D]">
                                                    Session type
                                                </div>
                                                <button
                                                    onClick={() => setSessionType('all')}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>All</span>
                                                    {sessionType === 'all' && (
                                                        <Icons.Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setSessionType('agent')}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Agent</span>
                                                    {sessionType === 'agent' && (
                                                        <Icons.Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setSessionType('search')}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Search</span>
                                                    {sessionType === 'search' && (
                                                        <Icons.Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </button>

                                                <div className="h-[1px] bg-[#2B2A29] mx-1 my-1" />

                                                <button
                                                    onClick={() => {
                                                        setIsRecentMenuOpen(false)
                                                        onSessions?.()
                                                        onClose()
                                                    }}
                                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>View all sessions</span>
                                                </button>
                                            </div>,
                                            document.body
                                        )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-[2px] mt-1 overflow-y-auto no-scrollbar flex-1 min-h-0 pb-2">
                            {isAuthenticated ? (
                                isSessionsLoading ? (
                                    <SidebarSessionsSkeleton />
                                ) : recentProjects.length > 0 ? (
                                    recentProjects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="flex items-center justify-between px-2.5 py-2 w-full text-left rounded-xl hover:bg-[#202020] active:bg-[#252525] transition-colors cursor-pointer relative"
                                            onClick={() => {
                                                onOpenProject(project.id)
                                                onClose()
                                            }}
                                        >
                                            <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                                                <span className="font-normal text-[12.5px] transition-colors tracking-tight text-[#EDEDED] truncate leading-snug">
                                                    {project.title}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[11px] text-[#8F8E8D] tracking-tight truncate mt-[2px]">
                                                    <span>
                                                        {formatRelativeTime(project.updatedAt)}
                                                    </span>
                                                    {project.prNumber ? (
                                                        <>
                                                            <span className="text-[#555] select-none">
                                                                •
                                                            </span>
                                                            <span className="text-[#C084FC] inline-flex items-center gap-0.5 font-mono text-[10.5px]">
                                                                <Icons.GitPullRequest className="w-3 h-3 text-[#C084FC]" />
                                                                <span>{project.prNumber}</span>
                                                            </span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-1.5 text-[12px] font-medium text-[#616161] tracking-tight">
                                        No recent sessions
                                    </div>
                                )
                            ) : (
                                <div className="px-2.5 py-2 flex flex-col gap-2 text-left">
                                    <p className="text-[11.5px] text-[#7A7A7A] leading-normal font-sans">
                                        Sign in to view your recent sessions and chat history.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onOpenAuth?.()
                                            onClose()
                                        }}
                                        className="w-full py-1 px-2.5 rounded-lg bg-[#202020] hover:bg-[#282828] border border-[#313131] hover:border-[#3E3E3E] text-[#EDEDED] hover:text-white text-[12px] font-medium transition-all text-center cursor-pointer"
                                    >
                                        Sign in
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <SidebarFooter
                    isAuthenticated={isAuthenticated}
                    isCollapsed={false}
                    onProfile={onProfile}
                    onOpenAuth={onOpenAuth}
                    user={user}
                    onSignOut={onSignOut}
                />
            </div>

            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onNewThread={isAuthenticated ? onNewThread : onOpenAuth}
                isAuthenticated={isAuthenticated}
            />
        </>
    )
}
