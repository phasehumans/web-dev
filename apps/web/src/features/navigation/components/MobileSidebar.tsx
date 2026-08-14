import { History } from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

import { SearchModal } from './SearchModal'
import { SidebarFooter } from './SidebarFooter'

import type { MobileSidebarProps } from '@/features/navigation/types'

import { useProjects } from '@/features/sessions/hooks/useProjects'
import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

export const MobileSidebar: React.FC<
    MobileSidebarProps & { onSignOut?: () => void; onHomeClick?: () => void; user?: any }
> = ({
    isOpen,
    onClose,
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
    onSignOut,
    onHomeClick,
    user,
}) => {
    const { data: projects = [], isLoading: isProjectsLoading } = useProjects()
    const location = useLocation()
    const path = location.pathname

    const isHomeActive = path === '/'
    const isProjectsActive = path.startsWith('/projects')
    const isReviewActive = path.startsWith('/review')
    const isWikiActive = path.startsWith('/wiki') || path.startsWith('/templates')
    const isDocsActive = path.startsWith('/docs')
    const isSettingsActive = path.startsWith('/settings') || path.startsWith('/profile')

    const [isSearchOpen, setIsSearchOpen] = React.useState(false)
    const [isRecentMenuOpen, setIsRecentMenuOpen] = React.useState(false)
    const [recentMenuPos, setRecentMenuPos] = React.useState<{ top: number; left: number } | null>(
        null
    )
    const [sortBy, setSortBy] = React.useState<'created' | 'updated'>('updated')
    const recentMenuRef = React.useRef<HTMLDivElement | null>(null)
    const recentMenuTriggerRef = React.useRef<HTMLButtonElement | null>(null)

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
                    onClose()
                } else {
                    if (onOpenAuth) onOpenAuth()
                }
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
            id: 'review',
            label: 'Review',
            icon: <Icons.GitPullRequest className="w-[18px] h-[18px]" />,
            onClick: () => {
                if (onReview) onReview()
                onClose()
            },
        },
        {
            id: 'templates',
            label: 'Wiki',
            icon: <Icons.BookOpen className="w-[18px] h-[18px]" />,
            onClick: () => {
                onTemplates()
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

                <div className="flex-1 flex flex-col mt-2 mb-2 font-sans pl-[10px] pr-3 min-h-0">
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-3 py-1.5 w-full text-left group shrink-0 z-10">
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
                                            } else {
                                                if (!isRecentMenuOpen) {
                                                    const rect =
                                                        e.currentTarget.getBoundingClientRect()
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
                                    </button>
                                    {isRecentMenuOpen &&
                                        recentMenuPos &&
                                        typeof document !== 'undefined' &&
                                        createPortal(
                                            <div
                                                ref={recentMenuRef}
                                                className="fixed z-[200] w-[160px] rounded-2xl border border-[#2E2D2C] bg-[#1E1E1E] shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                                style={{
                                                    top: recentMenuPos.top,
                                                    left: recentMenuPos.left,
                                                }}
                                            >
                                                <div className="px-3 py-1 text-[12px] font-medium text-[#8F8E8D]">
                                                    Sort by
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSortBy('created')
                                                        setIsRecentMenuOpen(false)
                                                    }}
                                                    className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl hover:bg-[#252525] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Created time</span>
                                                    {sortBy === 'created' && (
                                                        <span className="text-white text-[14px]">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSortBy('updated')
                                                        setIsRecentMenuOpen(false)
                                                    }}
                                                    className="flex items-center justify-between w-full px-3 py-1.5 rounded-xl hover:bg-[#252525] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>Last updated</span>
                                                    {sortBy === 'updated' && (
                                                        <span className="text-white text-[14px]">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                                <div className="h-[1px] bg-[#2B2A29] mx-1 my-1" />
                                                <button
                                                    onClick={() => {
                                                        setIsRecentMenuOpen(false)
                                                        onSessions?.()
                                                        onClose()
                                                    }}
                                                    className="flex items-center gap-3 w-full px-3 py-1.5 rounded-xl hover:bg-[#252525] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                                                >
                                                    <span>View all projects</span>
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
                                            onClick={() => {
                                                onOpenProject(project.id)
                                                onClose()
                                            }}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2 overflow-hidden">
                                                <span className="font-normal text-[12px] transition-colors tracking-tight text-[#E8E8E8] group-hover:text-[#E8E8E8] truncate">
                                                    {/* @ts-expect-error -- fallback for project name property */}
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
                    isCollapsed={false}
                    onProfile={() => {
                        onProfile()
                        onClose()
                    }}
                    onDocs={() => {
                        onDocs()
                        onClose()
                    }}
                    onOpenAuth={() => {
                        onOpenAuth()
                        onClose()
                    }}
                    user={user}
                    onSignOut={() => {
                        onSignOut?.()
                        onClose()
                    }}
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
