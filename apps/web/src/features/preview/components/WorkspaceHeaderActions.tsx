import {
    Settings,
    Flag,
    MoreHorizontal,
    Search,
    Pencil,
    Folder,
    Tag,
    Archive,
    MessageSquare,
    Clock,
    TrendingUp,
    ChevronRight,
    GitPullRequest,
} from 'lucide-react'
import React, { useState } from 'react'

import { SettingsBigModal } from './settings/SettingsBigModal'

import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'

import { Button } from '@/shared/components/ui/Button'
import { Icons } from '@/shared/components/ui/Icons'

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
}

export const WorkspaceHeaderActions: React.FC<WorkspaceHeaderActionsProps> = ({
    projectName,
    projectId,
    activeVersionId,
    isPreviewCollapsed,
    onTogglePreview,
}) => {
    const [activePanel, setActivePanel] = useState<'settings' | null>(null)
    const [settingsTab, setSettingsTab] = useState<
        'general' | 'share' | 'integrations' | 'variables' | 'domains' | 'analytics' | 'publish'
    >('general')

    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
    const [menuSearchQuery, setMenuSearchQuery] = useState('')
    const moreMenuRef = React.useRef<HTMLDivElement | null>(null)

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

    const openSettings = (tab: typeof settingsTab) => {
        setSettingsTab(tab)
        setActivePanel('settings')
    }

    const versionDisplay = activeVersionId ? `#${activeVersionId.slice(0, 4)}` : '#1'

    const menuItems = [
        {
            id: 'rename',
            label: 'Rename',
            icon: <Pencil className="w-3.5 h-3.5" />,
            action: () => openSettings('general'),
        },
        {
            id: 'folder',
            label: 'Folder',
            icon: <Folder className="w-3.5 h-3.5" />,
            hasSubmenu: true,
        },
        {
            id: 'edit_tags',
            label: 'Edit tags',
            icon: <Tag className="w-3.5 h-3.5" />,
            action: () => openSettings('general'),
        },
        { id: 'archive', label: 'Archive', icon: <Archive className="w-3.5 h-3.5" /> },
        {
            id: 'more',
            label: 'More',
            icon: <MoreHorizontal className="w-3.5 h-3.5" />,
            hasSubmenu: true,
        },
    ]

    const filteredMenuItems = React.useMemo(() => {
        if (!menuSearchQuery.trim()) return menuItems
        return menuItems.filter((item) =>
            item.label.toLowerCase().includes(menuSearchQuery.toLowerCase())
        )
    }, [menuSearchQuery])

    return (
        <div className="flex items-center gap-1 relative">
            {/* 1. Settings */}
            <Button
                variant="ghost"
                size="icon"
                title="Settings"
                onClick={() => openSettings('general')}
                className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer ${activePanel === 'settings' ? 'text-white bg-white/5' : ''}`}
            >
                <Settings size={16} />
            </Button>

            {/* 2. PR Tag Badge */}
            <div className="hidden lg:flex items-center gap-1.5 mx-0.5">
                <div
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1A22] border border-[#2E2838] text-xs font-mono text-[#A855F7] hover:bg-[#252030] hover:border-[#3E344A] transition-colors cursor-pointer select-none"
                    title={`Pull Request ${versionDisplay}`}
                >
                    <GitPullRequest className="w-3.5 h-3.5 text-[#A855F7]" />
                    <span className="font-medium tracking-tight">{versionDisplay}</span>
                </div>
            </div>

            {/* 3. Flag */}
            <Button
                variant="ghost"
                size="icon"
                title="Report issue / Flag"
                className="text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer"
            >
                <Flag size={16} />
            </Button>

            {/* 4. 3 dots */}
            <div className="relative" ref={moreMenuRef}>
                <Button
                    variant="ghost"
                    size="icon"
                    title="More options"
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className={`text-[#91908F] hover:text-white hidden md:flex h-8 w-8 transition-colors outline-none border-none ring-0 focus:outline-none cursor-pointer ${isMoreMenuOpen ? 'text-white bg-white/5' : ''}`}
                >
                    <MoreHorizontal size={16} />
                </Button>

                {isMoreMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#18181A] border border-[#2A2A2D] rounded-2xl shadow-2xl z-50 p-2 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 select-none">
                        {/* Search Bar */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] border border-[#252528] rounded-xl mb-1.5">
                            <Search className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={menuSearchQuery}
                                onChange={(e) => setMenuSearchQuery(e.target.value)}
                                autoFocus
                                className="bg-transparent text-xs text-[#EDEDED] placeholder-[#71717A] outline-none w-full"
                            />
                        </div>

                        {/* Top Action Items */}
                        <div className="flex flex-col gap-0.5">
                            {filteredMenuItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        item.action?.()
                                        setIsMoreMenuOpen(false)
                                    }}
                                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-[#8E8D8C] shrink-0">{item.icon}</span>
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    {item.hasSubmenu && (
                                        <ChevronRight className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#2A2A2D] my-1.5" />

                        {/* Feedback Section */}
                        <button
                            type="button"
                            onClick={() => setIsMoreMenuOpen(false)}
                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                            <span>Give feedback</span>
                        </button>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#2A2A2D] my-1.5" />

                        {/* Usage & Insights Section */}
                        <div className="flex flex-col gap-0.5">
                            <button
                                type="button"
                                disabled
                                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#52525B] cursor-not-allowed text-left outline-none"
                            >
                                <Clock className="w-3.5 h-3.5 text-[#52525B] shrink-0" />
                                <span>Session usage limits</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer"
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                <span>Session insights</span>
                            </button>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-2 pt-2 px-2.5 flex flex-col gap-1 text-[11px] text-[#8E8D8C]">
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

            {/* big full-screen settings overlay */}
            {activePanel === 'settings' && (
                <SettingsBigModal
                    onClose={() => setActivePanel(null)}
                    initialTab={settingsTab}
                    projectName={projectName ?? 'untitled'}
                    projectId={projectId}
                />
            )}
        </div>
    )
}

export const OutputHeaderActions = WorkspaceHeaderActions
