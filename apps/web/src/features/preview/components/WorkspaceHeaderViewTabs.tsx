import { Code, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

import { Tooltip } from '@/shared/components/ui/Tooltip'
import { cn } from '@/shared/lib/utils'

export type WorkspaceTabId = 'changes' | 'desktop' | 'editor' | 'shell' | 'tasks' | 'pull_requests'

export interface WorkspaceTabDef {
    id: WorkspaceTabId
    label: string
    icon: React.ReactNode
}

// Pixel-perfect SVG icons matching the UI reference screenshot
const ChangesIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
    >
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <path d="M5.5 5.5h5" strokeLinecap="round" />
        <path d="M8 3v5" strokeLinecap="round" />
        <path d="M5.5 10.5h5" strokeLinecap="round" />
    </svg>
)

const DesktopIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
    >
        <rect x="2" y="3" width="12" height="9" rx="1.5" />
        <path d="M4 5h2" strokeLinecap="round" />
        <path d="M10 9.5l3.2 3.2m-2.2 0h2.2v-2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

const ShellIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
    >
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <path d="M5 6.5l2 1.5-2 1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 9.5h2.5" strokeLinecap="round" />
    </svg>
)

const TasksIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
    >
        <path d="M3 5.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 5.5h4" strokeLinecap="round" />
        <path d="M3 11.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 11.5h4" strokeLinecap="round" />
    </svg>
)

const PullRequestsIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
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
)

export const BASE_TAB_DEFS: WorkspaceTabDef[] = [
    { id: 'changes', label: 'Changes', icon: <ChangesIcon /> },
    { id: 'desktop', label: 'Desktop', icon: <DesktopIcon /> },
    { id: 'shell', label: 'Shell', icon: <ShellIcon /> },
    { id: 'editor', label: 'Editor', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
]

export const AVAILABLE_PRS: WorkspaceTabDef[] = [
    {
        id: 'pull_requests',
        label: 'PR #97',
        icon: <PullRequestsIcon className="w-3.5 h-3.5 text-[#C084FC]" />,
    },
]

export const ALL_TAB_DEFS: WorkspaceTabDef[] = [...BASE_TAB_DEFS, ...AVAILABLE_PRS]

interface WorkspaceHeaderViewTabsProps {
    openTabs: WorkspaceTabId[]
    activeTab: WorkspaceTabId
    setActiveTab: (tab: WorkspaceTabId) => void
    onCloseTab: (tab: WorkspaceTabId) => void
    onAddTab: (tab: WorkspaceTabId) => void
    onReorderTabs: (tabs: WorkspaceTabId[]) => void
    onBack?: () => void
}

const ViewTabItem: React.FC<{
    def: WorkspaceTabDef
    isActive: boolean
    canClose: boolean
    isDragOver: boolean
    isDraggingThis: boolean
    onSelect: () => void
    onClose: () => void
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
}> = ({
    def,
    isActive,
    canClose,
    isDragOver,
    isDraggingThis,
    onSelect,
    onClose,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) => {
    return (
        <div
            role="tab"
            aria-selected={isActive}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            className={cn(
                'group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-normal transition-colors outline-none select-none relative cursor-pointer border-none',
                isActive
                    ? 'bg-[#202020] text-white shadow-none font-medium'
                    : 'bg-transparent text-[#91908F] hover:text-[#EDEDED] hover:bg-white/[0.04]',
                isDraggingThis && 'opacity-30',
                isDragOver && 'bg-[#2A2A2D] text-white'
            )}
        >
            <span
                className={cn(
                    'transition-colors flex items-center justify-center pointer-events-none shrink-0',
                    isActive ? 'text-white' : 'text-[#91908F] group-hover:text-[#EDEDED]'
                )}
            >
                {def.icon}
            </span>
            <span className="pointer-events-none truncate">{def.label}</span>
            {canClose && (
                <Tooltip content={`Close ${def.label.toLowerCase()}`} position="bottom">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[#91908F] hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/10 ml-0.5 shrink-0"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </Tooltip>
            )}
        </div>
    )
}

export const WorkspaceHeaderViewTabs: React.FC<WorkspaceHeaderViewTabsProps> = ({
    openTabs,
    activeTab,
    setActiveTab,
    onCloseTab,
    onAddTab,
    onReorderTabs,
    onBack,
}) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const [isPrSubmenuOpen, setIsPrSubmenuOpen] = React.useState(false)
    const [draggedTabId, setDraggedTabId] = React.useState<WorkspaceTabId | null>(null)
    const [dragOverTabId, setDragOverTabId] = React.useState<WorkspaceTabId | null>(null)
    const draggedTabRef = React.useRef<WorkspaceTabId | null>(null)
    const menuRef = React.useRef<HTMLDivElement | null>(null)
    const prCloseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    const handlePrMouseEnter = () => {
        if (prCloseTimeoutRef.current) {
            clearTimeout(prCloseTimeoutRef.current)
            prCloseTimeoutRef.current = null
        }
        setIsPrSubmenuOpen(true)
    }

    const handlePrMouseLeave = () => {
        if (prCloseTimeoutRef.current) {
            clearTimeout(prCloseTimeoutRef.current)
        }
        prCloseTimeoutRef.current = setTimeout(() => {
            setIsPrSubmenuOpen(false)
        }, 150)
    }

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
                setIsPrSubmenuOpen(false)
            }
        }
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    const handleDragStart = (tabId: WorkspaceTabId, e: React.DragEvent) => {
        draggedTabRef.current = tabId
        setDraggedTabId(tabId)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', tabId)
    }

    const handleDragOver = (tabId: WorkspaceTabId, e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverTabId !== tabId && draggedTabRef.current !== tabId) {
            setDragOverTabId(tabId)
        }
    }

    const handleDrop = (targetTabId: WorkspaceTabId, e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const sourceTabId = draggedTabRef.current
        if (sourceTabId && sourceTabId !== targetTabId) {
            const fromIndex = openTabs.indexOf(sourceTabId)
            const toIndex = openTabs.indexOf(targetTabId)
            if (fromIndex !== -1 && toIndex !== -1) {
                const nextTabs = [...openTabs]
                const [movedTab] = nextTabs.splice(fromIndex, 1)
                nextTabs.splice(toIndex, 0, movedTab)
                onReorderTabs(nextTabs)
            }
        }
        draggedTabRef.current = null
        setDraggedTabId(null)
        setDragOverTabId(null)
    }

    const handleDragEnd = () => {
        draggedTabRef.current = null
        setDraggedTabId(null)
        setDragOverTabId(null)
    }

    return (
        <div className="flex items-center gap-1.5 relative">
            <button
                onClick={onBack}
                className="md:hidden p-1.5 text-[#91908F] hover:text-white mr-1 rounded-md hover:bg-white/5 transition-colors"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="hidden md:flex items-center gap-1 bg-[#141414] p-0.5 rounded-xl">
                {openTabs.map((tabId) => {
                    const def = ALL_TAB_DEFS.find((t) => t.id === tabId)
                    if (!def) return null
                    return (
                        <ViewTabItem
                            key={tabId}
                            def={def}
                            isActive={activeTab === tabId}
                            canClose={openTabs.length > 1}
                            isDragOver={dragOverTabId === tabId}
                            isDraggingThis={draggedTabId === tabId}
                            onSelect={() => setActiveTab(tabId)}
                            onClose={() => onCloseTab(tabId)}
                            onDragStart={(e) => handleDragStart(tabId, e)}
                            onDragOver={(e) => handleDragOver(tabId, e)}
                            onDrop={(e) => handleDrop(tabId, e)}
                            onDragEnd={handleDragEnd}
                        />
                    )
                })}

                {/* + Add Tab Dropdown Trigger */}
                <div className="relative" ref={menuRef}>
                    <Tooltip content="Add view tab" position="bottom" align="start">
                        <button
                            type="button"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={cn(
                                'p-1.5 text-[#6E6E6E] hover:text-[#D4D4D8] hover:bg-[#1C1C1E] rounded-lg transition-colors outline-none cursor-pointer',
                                isMenuOpen && 'bg-[#1C1C1E] text-[#D4D4D8]'
                            )}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </Tooltip>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#1A1A1C] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex flex-col">
                                {BASE_TAB_DEFS.map((def) => {
                                    return (
                                        <button
                                            key={def.id}
                                            type="button"
                                            onClick={() => {
                                                onAddTab(def.id)
                                                setIsMenuOpen(false)
                                                setIsPrSubmenuOpen(false)
                                            }}
                                            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D6D5D4] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer"
                                        >
                                            <span className="text-[#8E8D8C] shrink-0">
                                                {def.icon}
                                            </span>
                                            <span className="truncate">{def.label}</span>
                                        </button>
                                    )
                                })}

                                {/* Pull Requests submenu trigger row */}
                                <div
                                    className="relative"
                                    onMouseEnter={handlePrMouseEnter}
                                    onMouseLeave={handlePrMouseLeave}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsPrSubmenuOpen(!isPrSubmenuOpen)}
                                        className={cn(
                                            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D6D5D4] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer',
                                            isPrSubmenuOpen && 'bg-[#252528] text-white'
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <span className="text-[#8E8D8C] shrink-0">
                                                <PullRequestsIcon className="w-3.5 h-3.5 text-[#8E8D8C]" />
                                            </span>
                                            <span className="truncate">Pull requests</span>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0 ml-1.5" />
                                    </button>

                                    {/* Flyout Submenu on hover/click with invisible hover bridge */}
                                    {isPrSubmenuOpen && (
                                        <div
                                            className="absolute left-full top-0 ml-1.5 w-44 bg-[#1A1A1C] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 before:content-[''] before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-3"
                                            onMouseEnter={handlePrMouseEnter}
                                            onMouseLeave={handlePrMouseLeave}
                                        >
                                            {AVAILABLE_PRS.map((pr) => (
                                                <button
                                                    key={pr.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onAddTab(pr.id)
                                                        setIsMenuOpen(false)
                                                        setIsPrSubmenuOpen(false)
                                                    }}
                                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D6D5D4] hover:bg-[#252528] hover:text-white transition-colors text-left outline-none cursor-pointer"
                                                >
                                                    <span className="shrink-0">{pr.icon}</span>
                                                    <span className="truncate">{pr.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export const OutputHeaderViewTabs = WorkspaceHeaderViewTabs
