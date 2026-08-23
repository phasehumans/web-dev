import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Icons } from '@/shared/components/ui/Icons'
import { cn } from '@/shared/lib/utils'

interface SearchModalProps {
    isOpen: boolean
    onClose: () => void
    onNewThread?: () => void
    isAuthenticated?: boolean
}

export type SearchCategory = 'Recent' | 'Navigation' | 'Settings Subpages'

export interface SearchItem {
    id: string
    label: string
    subtitle?: string
    category: SearchCategory
    icon: React.ReactNode
    keywords?: string[]
    action: () => void
}

export const SearchModal: React.FC<SearchModalProps> = ({
    isOpen,
    onClose,
    onNewThread,
    isAuthenticated,
}) => {
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const [recentIds, setRecentIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('december-search-recents') || '[]')
        } catch {
            return []
        }
    })

    // Reset search query and selected index on open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    const saveRecent = useCallback((id: string) => {
        setRecentIds((prev) => {
            const newRecents = [id, ...prev.filter((rId) => rId !== id)].slice(0, 5)
            localStorage.setItem('december-search-recents', JSON.stringify(newRecents))
            return newRecents
        })
    }, [])

    const allItems: SearchItem[] = useMemo(
        () => [
            // Main Navigation Pages
            {
                id: 'go-home',
                label: 'Home / New Session',
                subtitle: 'Start a new AI coding session',
                category: 'Navigation',
                icon: <Icons.Home className="w-4 h-4 text-neutral-400" />,
                keywords: ['home', 'new', 'chat', 'session', 'prompt', 'create', 'start'],
                action: () => {
                    onClose()
                    if (onNewThread) {
                        onNewThread()
                    } else {
                        navigate('/')
                    }
                },
            },
            {
                id: 'go-projects',
                label: 'Sessions',
                subtitle: 'View all active sessions & history',
                category: 'Navigation',
                icon: <Icons.Folder className="w-4 h-4 text-neutral-400" />,
                keywords: ['projects', 'history', 'threads', 'saved', 'chats', 'sessions'],
                action: () => {
                    onClose()
                    navigate('/projects')
                },
            },
            {
                id: 'go-templates',
                label: 'Wiki & Templates',
                subtitle: 'Explore repository wikis & templates',
                category: 'Navigation',
                icon: <Icons.BookOpen className="w-4 h-4 text-neutral-400" />,
                keywords: ['wiki', 'templates', 'codebase', 'repos', 'architecture'],
                action: () => {
                    onClose()
                    navigate('/templates')
                },
            },
            {
                id: 'go-activate',
                label: 'Device Activation',
                subtitle: 'Link CLI or secondary device code',
                category: 'Navigation',
                icon: <Icons.Terminal className="w-4 h-4 text-neutral-400" />,
                keywords: ['activate', 'cli', 'code', 'pair', 'terminal', 'device', 'link'],
                action: () => {
                    onClose()
                    navigate('/activate')
                },
            },

            // Settings Subpages
            {
                id: 'go-settings-account',
                label: 'Account Details',
                subtitle: 'Settings / Account',
                category: 'Settings Subpages',
                icon: <Icons.User className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'profile',
                    'account',
                    'password',
                    'security',
                    'email',
                    'avatar',
                    'user',
                    'name',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/account')
                },
            },
            {
                id: 'go-settings-preferences',
                label: 'Preferences & Appearance',
                subtitle: 'Settings / Preferences',
                category: 'Settings Subpages',
                icon: <Icons.DesignSystems className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'theme',
                    'dark mode',
                    'light mode',
                    'custom rules',
                    'shortcuts',
                    'appearance',
                    'display',
                    'preferences',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/preferences')
                },
            },
            {
                id: 'go-settings-integrations',
                label: 'Integrations & Connections',
                subtitle: 'Settings / Integrations',
                category: 'Settings Subpages',
                icon: <Icons.Globe className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'integrations',
                    'connections',
                    'github',
                    'oauth',
                    'services',
                    'third party',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/integrations')
                },
            },
            {
                id: 'go-settings-repositories',
                label: 'GitHub Repositories',
                subtitle: 'Settings / Repositories',
                category: 'Settings Subpages',
                icon: <Icons.Github className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'repos',
                    'repositories',
                    'github',
                    'git',
                    'sync',
                    'branches',
                    'codebase',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/repositories')
                },
            },
            {
                id: 'go-settings-skills',
                label: 'Agent Skills',
                subtitle: 'Settings / Skills',
                category: 'Settings Subpages',
                icon: <Icons.Skills className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'skills',
                    'agent',
                    'bot',
                    'tools',
                    'capabilities',
                    'custom skills',
                    'prompts',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/skills')
                },
            },
            {
                id: 'go-settings-secrets',
                label: 'API Keys & Secrets',
                subtitle: 'Settings / Secrets',
                category: 'Settings Subpages',
                icon: <Icons.Lock className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'api key',
                    'secrets',
                    'tokens',
                    'credentials',
                    'env',
                    'variables',
                    'keys',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/secrets')
                },
            },
            {
                id: 'go-settings-review',
                label: 'Code Review Settings',
                subtitle: 'Settings / Review',
                category: 'Settings Subpages',
                icon: <Icons.DesignSystems className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'review',
                    'code review',
                    'linter',
                    'standards',
                    'pr',
                    'pull request',
                    'rules',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/review')
                },
            },
            {
                id: 'go-settings-wiki',
                label: 'Repository Wiki Settings',
                subtitle: 'Settings / Wiki',
                category: 'Settings Subpages',
                icon: <Icons.BookOpen className="w-4 h-4 text-neutral-400" />,
                keywords: ['wiki settings', 'docs generation', 'markdown', 'knowledge base'],
                action: () => {
                    onClose()
                    navigate('/settings/wiki')
                },
            },
            {
                id: 'go-settings-schedules',
                label: 'Schedules & Timers',
                subtitle: 'Settings / Schedules',
                category: 'Settings Subpages',
                icon: <Icons.Clock className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'schedules',
                    'cron',
                    'timers',
                    'recurring',
                    'automation',
                    'tasks',
                    'jobs',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/schedules')
                },
            },
            {
                id: 'go-settings-billing',
                label: 'Billing & Credits',
                subtitle: 'Settings / Billing',
                category: 'Settings Subpages',
                icon: <Icons.Clock className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'billing',
                    'credits',
                    'payment',
                    'invoices',
                    'receipts',
                    'subscription',
                    'plan',
                    'pricing',
                    'pro',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/billing')
                },
            },
            {
                id: 'go-settings-usage',
                label: 'Usage & Quotas',
                subtitle: 'Settings / Usage',
                category: 'Settings Subpages',
                icon: <Icons.Clock className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'usage',
                    'quotas',
                    'token limit',
                    'ai calls',
                    'metrics',
                    'stats',
                    'analytics',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/usage')
                },
            },
            {
                id: 'go-settings-privacy',
                label: 'Privacy & Security',
                subtitle: 'Settings / Privacy',
                category: 'Settings Subpages',
                icon: <Icons.Lock className="w-4 h-4 text-neutral-400" />,
                keywords: [
                    'privacy',
                    'security',
                    'data',
                    'encryption',
                    'gdpr',
                    'compliance',
                    'terms',
                ],
                action: () => {
                    onClose()
                    navigate('/settings/privacy')
                },
            },
        ],
        [onClose, onNewThread, navigate]
    )

    const defaultRecentIds = useMemo(() => ['go-projects', 'go-settings-account'], [])
    const activeRecentIds = recentIds.length > 0 ? recentIds : defaultRecentIds

    const recentItems = useMemo(
        () =>
            activeRecentIds
                .map((id) => allItems.find((i) => i.id === id))
                .filter((i): i is SearchItem => Boolean(i))
                .map((i) => ({ ...i, category: 'Recent' as const })),
        [activeRecentIds, allItems]
    )

    const displayedItems: SearchItem[] = useMemo(() => {
        if (searchQuery.trim() === '') {
            // Show recent items first, then all remaining items
            return [...recentItems, ...allItems]
        }
        const query = searchQuery.toLowerCase()
        return allItems.filter(
            (item) =>
                item.label.toLowerCase().includes(query) ||
                item.subtitle?.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.keywords?.some((k) => k.toLowerCase().includes(query))
        )
    }, [searchQuery, recentItems, allItems])

    const categories: SearchCategory[] = ['Recent', 'Navigation', 'Settings Subpages']

    useEffect(() => {
        setSelectedIndex(0)
    }, [searchQuery])

    useEffect(() => {
        if (!isOpen) return
        const element = document.getElementById(`search-item-${selectedIndex}`)
        if (element) {
            element.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex, isOpen])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % (displayedItems.length || 1))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(
                    (prev) => (prev - 1 + displayedItems.length) % (displayedItems.length || 1)
                )
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (displayedItems[selectedIndex]) {
                    const item = displayedItems[selectedIndex]
                    saveRecent(item.id)
                    if (e.ctrlKey || e.metaKey) {
                        window.open(window.location.origin, '_blank')
                        onClose()
                    } else {
                        item.action()
                    }
                }
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, displayedItems, selectedIndex, onClose, saveRecent])

    if (!isOpen) return null

    let currentIndex = 0

    return (
        <div
            className="fixed inset-0 bg-black/40 z-[200] flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[648px] bg-[#1E1E1E] border border-[#282828] rounded-[14px] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center px-4 py-3.5 border-b border-[#282828] bg-[#1E1E1E]">
                    <Icons.Search className="w-4 h-4 text-[#888888] mr-3 shrink-0" />
                    <input
                        ref={inputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type a page, subpage, or topic..."
                        className="w-full bg-transparent text-[14.5px] font-medium text-[#EDEDED] placeholder-[#777777] focus:outline-none caret-white font-sans"
                    />
                </div>

                {/* Results list */}
                <div className="flex flex-col py-2 max-h-[428px] overflow-y-auto no-scrollbar">
                    {categories.map((category) => {
                        const categoryItems = displayedItems.filter(
                            (item) => item.category === category
                        )
                        if (categoryItems.length === 0) return null

                        return (
                            <div key={category} className="flex flex-col mb-2 last:mb-0">
                                <div className="px-4 py-1.5 mt-1 text-[12px] font-semibold text-[#7B7A79]">
                                    {category === 'Recent' && recentIds.length === 0
                                        ? 'Recommendations'
                                        : category}
                                </div>
                                <div className="flex flex-col gap-0.5 px-2 pb-1">
                                    {categoryItems.map((item, localIdx) => {
                                        const itemIndex = currentIndex++
                                        const isSelected = itemIndex === selectedIndex

                                        return (
                                            <button
                                                key={`${category}-${item.id}-${localIdx}`}
                                                id={`search-item-${itemIndex}`}
                                                onClick={() => {
                                                    saveRecent(item.id)
                                                    item.action()
                                                }}
                                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                className={cn(
                                                    'flex items-center justify-between px-3 py-2 rounded-lg transition-colors w-full text-left outline-none cursor-pointer group',
                                                    isSelected
                                                        ? 'bg-[#2A2928]'
                                                        : 'hover:bg-[#2A2928]/40'
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="shrink-0 text-[#888888] group-hover:text-[#EDEDED] flex items-center justify-center">
                                                        {item.icon}
                                                    </div>
                                                    <div className="flex items-baseline min-w-0 gap-2 truncate">
                                                        <span
                                                            className={cn(
                                                                'text-[14px] font-medium transition-colors',
                                                                isSelected
                                                                    ? 'text-[#EDEDED]'
                                                                    : 'text-[#D6D5D4]'
                                                            )}
                                                        >
                                                            {item.label}
                                                        </span>
                                                        {item.subtitle && (
                                                            <span className="text-[13px] text-[#7B7A79] transition-colors truncate">
                                                                {item.subtitle}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                    {displayedItems.length === 0 && (
                        <div className="py-8 text-center text-[14px] text-[#7B7A79]">
                            No results found for "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
