import React from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'

import { SearchModal } from './SearchModal'
import { SidebarFooter } from './SidebarFooter'

import type { SidebarProps } from '@/features/navigation/types'

import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { SettingsBigModal } from '@/features/preview/components/settings/SettingsBigModal'
import { useProjects } from '@/features/sessions/hooks/useProjects'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

const Sidebar: React.FC<
    SidebarProps & {
        user?: any
        onSignOut?: () => void
        onHomeClick?: () => void
        onCollapse?: () => void
        isCollapsed?: boolean
        onExpand?: () => void
    }
> = ({
    onNewThread,
    onAllProjects,
    onSessions,
    onReview,
    onTemplates,
    onDocs,
    onProfile,
    onOpenProject,
    isAuthenticated,
    onOpenAuth,
    user,
    onSignOut,
    onHomeClick,
    onCollapse,
    isCollapsed,
    onExpand,
}) => {
    const { data: projects = [], isLoading: isProjectsLoading } = useProjects()
    const navigate = useNavigate()
    const location = useLocation()
    const path = location.pathname

    const [isSearchOpen, setIsSearchOpen] = React.useState(false)
    const [isRecentMenuOpen, setIsRecentMenuOpen] = React.useState(false)
    const [settingsProjectId, setSettingsProjectId] = React.useState<string | null>(null)
    const [recentMenuPos, setRecentMenuPos] = React.useState<{ top: number; left: number } | null>(
        null
    )
    const [sortBy, setSortBy] = React.useState<'created' | 'updated'>('updated')
    const [filterSchedules, setFilterSchedules] = React.useState(true)
    const [filterArchived, setFilterArchived] = React.useState(false)
    const [filterAutomations, setFilterAutomations] = React.useState(false)
    const [sessionType, setSessionType] = React.useState<'all' | 'agent' | 'search'>('all')
    const recentMenuRef = React.useRef<HTMLDivElement | null>(null)
    const recentMenuTriggerRef = React.useRef<HTMLButtonElement | null>(null)
    const [isLogoAnimating, setIsLogoAnimating] = React.useState(false)

    React.useEffect(() => {
        if (isCollapsed) {
            setIsLogoAnimating(true)
            const timer = setTimeout(() => setIsLogoAnimating(false), 1000)
            return () => clearTimeout(timer)
        }
    }, [isCollapsed])

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

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setIsSearchOpen((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const isHomeActive = path === '/'
    const isProjectsActive =
        path.startsWith('/projects') ||
        path.startsWith('/all-projects') ||
        path.startsWith('/sessions')
    const isReviewActive = path.startsWith('/review')
    const isWikiActive = path.startsWith('/wiki') || path.startsWith('/templates')
    const isDocsActive = path.startsWith('/docs')
    const isSettingsActive = path.startsWith('/settings') || path.startsWith('/profile')

    let activeIndex = 0
    if (isSearchOpen) {
        activeIndex = 1
    } else if (!isHomeActive) {
        if (isProjectsActive) activeIndex = 2
        else if (isReviewActive) activeIndex = 3
        else if (isWikiActive) activeIndex = 4
        else if (isSettingsActive) activeIndex = 5
    } else {
        activeIndex = 0
    }

    const navItems = [
        {
            id: 'new',
            label: 'New',
            icon: (
                <div className="w-[19px] h-[19px] rounded-full bg-[#333333] flex items-center justify-center shrink-0">
                    <Icons.Plus className="w-2.5 h-2.5 text-[#E8E8E8]" strokeWidth={2.5} />
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
            },
        },
        {
            id: 'search',
            label: 'Search',
            icon: <Icons.Search className="w-[17px] h-[17px]" />,
            onClick: () => {
                if (isAuthenticated) {
                    setIsSearchOpen(true)
                } else {
                    if (onOpenAuth) onOpenAuth()
                }
            },
        },
        {
            id: 'sessions',
            label: 'Sessions',
            icon: <Icons.Folder className="w-[17px] h-[17px]" />,
            onClick: onSessions,
        },
        {
            id: 'review',
            label: 'Review',
            icon: <Icons.GitPullRequest className="w-[17px] h-[17px]" />,
            onClick: onReview,
        },
        {
            id: 'templates',
            label: 'Wiki',
            icon: <Icons.BookOpen className="w-[17px] h-[17px]" />,
            onClick: onTemplates,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Icons.Settings className="w-[17px] h-[17px]" />,
            onClick: onProfile,
        },
    ]

    // keep exact same size (was 200px when open)
    // no collapse option

    const { data: overview } = useBillingOverview()
    const isPro = (overview as any)?.plan === 'PRO'

    const recentProjects = isAuthenticated
        ? [...projects]
              .sort((a, b) =>
                  sortBy === 'created'
                      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      : new Date(b.rawUpdatedAt).getTime() - new Date(a.rawUpdatedAt).getTime()
              )
              .slice(0, 10)
        : []

    return (
        <div
            className={cn(
                'hidden md:flex flex-col h-screen bg-sidebar border-r border-white/5 pt-0 pb-0 z-[60] font-sans transition-all duration-300',
                isCollapsed ? 'w-[56px] items-center' : 'w-[200px]'
            )}
        >
            {isCollapsed ? (
                <div className="px-2 mb-2 mt-0 z-30 relative">
                    <div className="flex items-center justify-center w-full h-11 mb-2 mt-0">
                        <div
                            className="flex items-center justify-center w-[32px] h-[32px] relative group cursor-pointer rounded-[10px] hover:bg-[#252525] transition-colors"
                            onClick={(e) => {
                                e.stopPropagation()
                                onExpand?.()
                            }}
                        >
                            <Icons.DecemberLogo
                                className={cn(
                                    'w-6 h-6 text-[#D6D5D4] group-hover:hidden',
                                    isLogoAnimating
                                        ? 'transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] rotate-[360deg]'
                                        : 'rotate-0'
                                )}
                            />
                            <Icons.SidebarToggle className="w-4 h-4 text-[#919191] group-hover:text-[#D4D4D8] hidden group-hover:block" />

                            <div className="absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 z-50 hidden group-hover:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                <span className="text-[12px] font-medium text-[#EDEDEF]">
                                    Open sidebar{' '}
                                    <span className="text-[#919191] ml-1 text-[10px] border border-[#333] rounded px-1 py-0.5 bg-[#252525]">
                                        Ctrl .
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-[1px] relative items-center">
                        {navItems.map((item, idx) => {
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.onClick}
                                    className={cn(
                                        'relative flex items-center justify-center w-[32px] h-[32px] rounded-[10px] transition-all group outline-none',
                                        activeIndex === idx
                                            ? 'bg-[#1F1F1F] text-[#D6D5D4]'
                                            : item.id === 'new'
                                              ? 'text-[#919191] hover:text-[#D6D5D4]'
                                              : 'hover:bg-[#252525] text-[#919191] hover:text-[#D6D5D4]'
                                    )}
                                >
                                    {item.icon}
                                    <div className="absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 z-50 hidden group-hover:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                                            {item.id === 'new' ? 'Create new session' : item.label}
                                        </span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="px-3 mb-2 mt-0 z-30 relative">
                    <div className="flex items-center justify-between px-2 h-11 mb-2 mt-0">
                        <Icons.DecemberLogo className="w-6 h-6 text-[#D6D5D4]" />
                        {onCollapse && (
                            <div
                                className="flex items-center justify-center text-[#919191] hover:text-[#D4D4D8] group/collapse p-1 rounded-md hover:bg-[#252525] transition-colors cursor-pointer relative"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onCollapse()
                                }}
                            >
                                <Icons.SidebarToggle className="w-4 h-4" />
                                <div className="absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 z-50 hidden group-hover/collapse:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                    <span className="text-[12px] font-medium text-[#EDEDEF]">
                                        Close sidebar{' '}
                                        <span className="text-[#919191] ml-1 text-[10px] border border-[#333] rounded px-1 py-0.5 bg-[#252525]">
                                            Ctrl .
                                        </span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-[1px] relative">
                        {navItems.map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                className={cn(
                                    'relative flex items-center justify-between w-full px-2.5 h-[30px] rounded-[9px] transition-all group outline-none',
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
                                            'font-medium text-[13.5px] tracking-tight transition-colors truncate',
                                            activeIndex === idx
                                                ? 'text-[#D6D5D4]'
                                                : 'text-[#919191] group-hover:text-[#D6D5D4]'
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </div>
                                {item.id === 'new' && (
                                    <div className="absolute top-1/2 left-[120px] -translate-y-1/2 z-50 hidden group-hover:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                                            Create new session
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div
                className={cn(
                    'flex-1 flex flex-col mt-0.5 mb-2 font-sans min-h-0',
                    isCollapsed ? 'px-2 hidden' : 'pl-[10px] pr-3'
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-3 py-1.5 w-full text-left group shrink-0 z-10">
                        <div className="flex items-center text-[#919191]">
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
                                        } else {
                                            if (!isRecentMenuOpen) {
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                setRecentMenuPos({
                                                    top: rect.top,
                                                    left: rect.right + 8,
                                                })
                                            }
                                            setIsRecentMenuOpen(!isRecentMenuOpen)
                                        }
                                    }}
                                    className="relative flex items-center justify-center p-1 rounded-md text-[#919191] hover:text-[#E8E8E8] hover:bg-[#252525] transition-all outline-none group/btn"
                                >
                                    <Icons.MoreHorizontal className="w-3.5 h-3.5" />
                                    <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 hidden group-hover/btn:flex items-center gap-1.5 bg-[#1F1F1F] border border-[#282828] px-2.5 py-1 rounded-lg shadow-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                        <span className="text-[12px] font-medium text-[#EDEDEF]">
                                            More options
                                        </span>
                                    </div>
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
                                                onClick={() => setFilterSchedules(!filterSchedules)}
                                                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                            >
                                                <span>Schedules</span>
                                                <div
                                                    className={`w-7 h-[14px] rounded-full flex items-center px-[2px] transition-colors ${filterSchedules ? 'bg-[#87B2F4]' : 'bg-[#333333]'}`}
                                                >
                                                    <div
                                                        className={`w-[10px] h-[10px] rounded-full bg-white transition-transform ${filterSchedules ? 'translate-x-[14px]' : 'translate-x-0'}`}
                                                    />
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setFilterArchived(!filterArchived)}
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

                    <div className="flex flex-col gap-[2px] mt-1 pr-1 overflow-y-auto no-scrollbar flex-1 min-h-0 pb-2">
                        {isAuthenticated ? (
                            isProjectsLoading ? null : recentProjects.length > 0 ? (
                                recentProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex items-center justify-between px-3 py-1 w-full text-left rounded-lg hover:bg-[#252525] transition-colors group cursor-pointer"
                                        onClick={() => onOpenProject?.(project.id)}
                                    >
                                        <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
                                            <span className="font-normal text-[12px] transition-colors tracking-tight text-[#E8E8E8] group-hover:text-[#E8E8E8] truncate">
                                                {/* @ts-expect-error */}
                                                {project.name || project.title}
                                            </span>
                                            <span className="text-[11px] text-[#8F8E8D] tracking-tight truncate mt-[1px]">
                                                {project.updatedAt || 'just now'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-1.5 text-[12px] font-medium text-[#616161] tracking-tight">
                                    No recent sessions
                                </div>
                            )
                        ) : (
                            <div className="px-3 py-1.5 text-[12px] font-medium text-[#616161] tracking-tight">
                                No recent sessions
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <SidebarFooter
                isAuthenticated={isAuthenticated}
                isCollapsed={isCollapsed || false}
                onProfile={onProfile}
                onDocs={onDocs}
                onOpenAuth={onOpenAuth}
                user={user}
                onSignOut={onSignOut}
            />

            <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onNewThread={isAuthenticated ? onNewThread : onOpenAuth}
                isAuthenticated={isAuthenticated}
            />

            {settingsProjectId && (
                <SettingsBigModal
                    isOpen={!!settingsProjectId}
                    onClose={() => setSettingsProjectId(null)}
                    projectId={settingsProjectId}
                />
            )}
        </div>
    )
}

export default Sidebar
