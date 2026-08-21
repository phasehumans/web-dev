import { useQueryClient } from '@tanstack/react-query'
import { History } from 'lucide-react'
import React from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

import { SearchModal } from './SearchModal'
import { SidebarFooter } from './SidebarFooter'

import type { MobileSidebarProps } from '@/features/navigation/types'

import { projectAPI } from '@/features/sessions/api/project'
import { sessionAPI } from '@/features/sessions/api/session'
import { SessionRenameModal } from '@/features/sessions/components/SessionRenameModal'
import { useProjects } from '@/features/sessions/hooks/useProjects'
import { useSessions } from '@/features/sessions/hooks/useSessions'
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
    const queryClient = useQueryClient()
    const { data: projects = [], isLoading: isProjectsLoading } = useProjects()
    const { data: sessionsData, isLoading: isSessionsLoading } = useSessions()
    const sessions = React.useMemo(() => sessionsData?.sessions || [], [sessionsData?.sessions])
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
    const [filterSchedules, setFilterSchedules] = React.useState(true)
    const [filterArchived, setFilterArchived] = React.useState(false)
    const [sessionType, setSessionType] = React.useState<'all' | 'agent' | 'search'>('all')
    const recentMenuRef = React.useRef<HTMLDivElement | null>(null)
    const recentMenuTriggerRef = React.useRef<HTMLButtonElement | null>(null)

    // Item menu state
    const [itemMenuState, setItemMenuState] = React.useState<{
        sessionId: string
        sessionTitle: string
        isArchived: boolean
        top: number
        left: number
    } | null>(null)
    const itemMenuRef = React.useRef<HTMLDivElement | null>(null)
    const [copiedSessionId, setCopiedSessionId] = React.useState<string | null>(null)

    // Rename modal state
    const [renameModal, setRenameModal] = React.useState<{
        isOpen: boolean
        sessionId: string
        value: string
    }>({
        isOpen: false,
        sessionId: '',
        value: '',
    })

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
            id: 'review',
            label: 'Review',
            icon: <Icons.GitPullRequest className="w-[18px] h-[18px]" />,
            onClick: () => {
                onReview()
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

    React.useEffect(() => {
        if (!itemMenuState) return
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null
            if (itemMenuRef.current && !itemMenuRef.current.contains(target)) {
                setItemMenuState(null)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('touchstart', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('touchstart', handleOutsideClick)
        }
    }, [itemMenuState])

    const handleToggleArchive = async (sessionId: string, currentArchived: boolean) => {
        const nextArchived = !currentArchived
        // Instant optimistic cache update
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s.id === sessionId ? { ...s, isArchived: nextArchived } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s.id === sessionId ? { ...s, isArchived: nextArchived } : s
                    ),
                }
            }
            return old
        })
        queryClient.setQueryData(['session', sessionId], (old: any) => {
            if (!old) return old
            return { ...old, isArchived: nextArchived }
        })
        queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
            if (!old || !Array.isArray(old)) return old
            return old.map((p) => (p.id === sessionId ? { ...p, isArchived: nextArchived } : p))
        })
        setItemMenuState(null)

        try {
            if (currentArchived) {
                await sessionAPI.unarchiveSession(sessionId)
            } else {
                await sessionAPI.archiveSession(sessionId)
            }
        } catch (err) {
            console.error('Failed to toggle archive:', err)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
    }

    const handleDeleteSession = async (sessionId: string) => {
        // Instant optimistic removal
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.filter((s) => s.id !== sessionId)
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.filter((s: any) => s.id !== sessionId),
                }
            }
            return old
        })
        queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
            if (!old || !Array.isArray(old)) return old
            return old.filter((p) => p.id !== sessionId)
        })
        setItemMenuState(null)

        try {
            await sessionAPI
                .deleteSession(sessionId)
                .catch(() => projectAPI.deleteProject(sessionId))
        } catch (err) {
            console.error('Failed to delete session:', err)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
    }

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const newTitle = renameModal.value.trim()
        const sessionId = renameModal.sessionId
        if (!newTitle || !sessionId) return

        // Instant optimistic rename
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s.id === sessionId ? { ...s, title: newTitle } : s
                    ),
                }
            }
            return old
        })
        queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
            if (!old || !Array.isArray(old)) return old
            return old.map((p) =>
                p.id === sessionId ? { ...p, title: newTitle, name: newTitle } : p
            )
        })
        setRenameModal({ isOpen: false, sessionId: '', value: '' })

        try {
            await sessionAPI.renameSession(sessionId, newTitle).catch(() => {})
        } catch (err) {
            console.error('Failed to rename session:', err)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
    }

    const handleCopyLink = (sessionId: string) => {
        const url = `${window.location.origin}/session/${sessionId}`
        navigator.clipboard.writeText(url)
        setCopiedSessionId(sessionId)
        setTimeout(() => {
            setCopiedSessionId(null)
            setItemMenuState(null)
        }, 1000)
    }

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

        const sourceList =
            sessions && sessions.length > 0
                ? sessions.map((s) => ({
                      id: s.id,
                      title: s.title || s.projectName || 'Untitled Session',
                      projectName: s.projectName,
                      updatedAt: s.updatedAt,
                      createdAt: s.createdAt,
                      isArchived: Boolean(s.isArchived),
                      type: s.type || 'WEB',
                      isSchedule: Boolean(
                          s.tags?.some((t) => t.toLowerCase().includes('schedule')) ||
                          s.type === ('SCHEDULE' as any)
                      ),
                      prNumber: s.prNumber,
                  }))
                : projects.map((p) => ({
                      id: p.id,
                      title: p.title || 'Untitled Session',
                      projectName: p.title,
                      updatedAt: p.rawUpdatedAt || p.updatedAt,
                      createdAt: p.createdAt,
                      isArchived: false,
                      type: 'WEB',
                      isSchedule: false,
                      prNumber: undefined as number | undefined,
                  }))

        return sourceList
            .filter((item) => {
                if (!filterSchedules && item.isSchedule) {
                    return false
                }
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
            .slice(0, 10)
    }, [isAuthenticated, sessions, projects, sortBy, filterSchedules, filterArchived, sessionType])

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
                                                        setFilterSchedules(!filterSchedules)
                                                    }
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
                                isProjectsLoading &&
                                isSessionsLoading ? null : recentProjects.length > 0 ? (
                                    recentProjects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="group flex items-center justify-between px-2.5 py-1.5 w-full text-left rounded-xl hover:bg-[#202020] transition-colors cursor-pointer relative"
                                            onClick={() => {
                                                onOpenProject(project.id)
                                                onClose()
                                            }}
                                        >
                                            <div className="flex flex-col min-w-0 pr-1.5 overflow-hidden flex-1">
                                                <span className="font-normal text-[12.5px] transition-colors tracking-tight text-[#EDEDED] group-hover:text-white truncate leading-snug">
                                                    {project.title}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[11px] text-[#8F8E8D] tracking-tight truncate mt-[2px]">
                                                    <span>
                                                        {formatRelativeTime(project.updatedAt)}
                                                    </span>
                                                    {project.type === 'SEARCH' ? (
                                                        <>
                                                            <span className="text-[#555] select-none">
                                                                •
                                                            </span>
                                                            <span className="text-[#8F8E8D] inline-flex items-center">
                                                                <Icons.Search className="w-3 h-3 text-[#8F8E8D]" />
                                                            </span>
                                                        </>
                                                    ) : project.prNumber ? (
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

                                            {/* Right side hover actions */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                {/* Archive Button with Tooltip */}
                                                <div className="relative group/btn">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleToggleArchive(
                                                                project.id,
                                                                project.isArchived
                                                            )
                                                        }}
                                                        className="p-1 rounded-md text-[#8F8E8D] hover:text-white hover:bg-[#2E2E2E] transition-colors cursor-pointer"
                                                        aria-label={
                                                            project.isArchived
                                                                ? 'Unarchive'
                                                                : 'Archive'
                                                        }
                                                    >
                                                        <Icons.Archive className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 hidden group-hover/btn:flex items-center gap-1 bg-[#1F1F1F] border border-[#282828] px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                                        <span className="text-[11.5px] font-medium text-[#EDEDEF]">
                                                            {project.isArchived
                                                                ? 'Unarchive'
                                                                : 'Archive'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 3 Dots Menu Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        const rect =
                                                            e.currentTarget.getBoundingClientRect()
                                                        setItemMenuState({
                                                            sessionId: project.id,
                                                            sessionTitle: project.title,
                                                            isArchived: project.isArchived,
                                                            top: rect.top,
                                                            left: rect.right + 8,
                                                        })
                                                    }}
                                                    className="p-1 rounded-md text-[#8F8E8D] hover:text-white hover:bg-[#2E2E2E] transition-colors cursor-pointer"
                                                    title="More options"
                                                    aria-label="More options"
                                                >
                                                    <Icons.MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
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
                                        onClick={onOpenAuth}
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
                    onDocs={onDocs}
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

            {/* Session Item 3-Dots Dropdown Menu Portal */}
            {itemMenuState &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={itemMenuRef}
                        className="fixed z-[250] w-[180px] rounded-xl border border-[#2E2D2C] bg-[#1E1E1E] shadow-2xl p-1 flex flex-col gap-0 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                        style={{
                            top: itemMenuState.top,
                            left: itemMenuState.left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Folder */}
                        <button
                            type="button"
                            onClick={() => {
                                setItemMenuState(null)
                                onOpenProject?.(itemMenuState.sessionId)
                                onClose()
                            }}
                            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                        >
                            <div className="flex items-center gap-2.5">
                                <Icons.Folder className="w-3.5 h-3.5 text-[#CBCACA] group-hover:text-white shrink-0" />
                                <span>Folder</span>
                            </div>
                            <div className="flex items-center gap-1 text-[#8F8E8D]">
                                <span className="text-[11.5px] font-normal truncate max-w-[70px]">
                                    {itemMenuState.sessionTitle || 'project1'}
                                </span>
                                <Icons.ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            </div>
                        </button>

                        {/* Rename */}
                        <button
                            type="button"
                            onClick={() => {
                                setRenameModal({
                                    isOpen: true,
                                    sessionId: itemMenuState.sessionId,
                                    value: itemMenuState.sessionTitle,
                                })
                                setItemMenuState(null)
                            }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                        >
                            <Icons.Edit className="w-3.5 h-3.5 text-[#CBCACA] group-hover:text-white shrink-0" />
                            <span>Rename</span>
                        </button>

                        {/* Copy session link */}
                        <button
                            type="button"
                            onClick={() => handleCopyLink(itemMenuState.sessionId)}
                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                        >
                            <Icons.Copy className="w-3.5 h-3.5 text-[#CBCACA] group-hover:text-white shrink-0" />
                            <span>
                                {copiedSessionId === itemMenuState.sessionId
                                    ? 'Copied!'
                                    : 'Copy session link'}
                            </span>
                        </button>

                        {/* Analyze session */}
                        <button
                            type="button"
                            onClick={() => {
                                setItemMenuState(null)
                                onOpenProject?.(itemMenuState.sessionId)
                                onClose()
                            }}
                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg hover:bg-[#2A2A2A] text-[#CBCACA] hover:text-white transition-colors text-left text-[12px] cursor-pointer outline-none group"
                        >
                            <Icons.Search className="w-3.5 h-3.5 text-[#CBCACA] group-hover:text-white shrink-0" />
                            <span>Analyze session</span>
                        </button>
                    </div>,
                    document.body
                )}

            {/* Session Rename Modal */}
            <SessionRenameModal
                isOpen={renameModal.isOpen}
                value={renameModal.value}
                isPending={false}
                onClose={() => setRenameModal({ isOpen: false, sessionId: '', value: '' })}
                onChange={(val) => setRenameModal((prev) => ({ ...prev, value: val }))}
                onSubmit={handleRenameSubmit}
            />
        </>
    )
}
