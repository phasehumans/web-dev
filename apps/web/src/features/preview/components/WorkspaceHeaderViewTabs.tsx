import {
    Monitor,
    Code,
    FilePlus,
    Terminal,
    GitPullRequest,
    FileSearch,
    Sliders,
    Plus,
    X,
    ChevronLeft,
} from 'lucide-react'
import React from 'react'

import { cn } from '@/shared/lib/utils'

export type WorkspaceTabId =
    | 'desktop'
    | 'editor'
    | 'changes'
    | 'shell'
    | 'pull_requests'
    | 'progress'
    | 'tasks'

export interface WorkspaceTabDef {
    id: WorkspaceTabId
    label: string
    icon: React.ReactNode
}

export const ALL_TAB_DEFS: WorkspaceTabDef[] = [
    { id: 'changes', label: 'Changes', icon: <FilePlus className="w-3.5 h-3.5" /> },
    { id: 'desktop', label: 'Desktop', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'shell', label: 'Shell', icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: 'editor', label: 'Editor', icon: <Code className="w-3.5 h-3.5" /> },
    {
        id: 'pull_requests',
        label: 'Pull requests',
        icon: <GitPullRequest className="w-3.5 h-3.5" />,
    },
    { id: 'progress', label: 'Progress', icon: <FileSearch className="w-3.5 h-3.5" /> },
    { id: 'tasks', label: 'Tasks', icon: <Sliders className="w-3.5 h-3.5" /> },
]

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
    onSelect,
    onClose,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) => {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
        <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onSelect}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all border outline-none select-none relative group cursor-grab active:cursor-grabbing',
                isActive
                    ? 'bg-[#1E1E20] text-[#EDEDED] border-[#2E2E32] shadow-sm'
                    : 'text-[#8F8E8D] border-transparent hover:text-[#EDEDED] hover:bg-[#18181A]',
                isDragOver && 'border-[#3B82F6] bg-[#222225] scale-[1.02]'
            )}
        >
            {canClose && isHovered ? (
                <span
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    className="text-[#91908F] hover:text-white transition-colors cursor-pointer"
                    title="Close tab"
                >
                    <X className="w-3.5 h-3.5" />
                </span>
            ) : (
                <span
                    className={cn(
                        'transition-colors',
                        isActive ? 'text-[#EDEDED]' : 'text-[#8F8E8D]'
                    )}
                >
                    {def.icon}
                </span>
            )}
            <span>{def.label}</span>
        </button>
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
    const [dragOverTabId, setDragOverTabId] = React.useState<WorkspaceTabId | null>(null)
    const draggedTabRef = React.useRef<WorkspaceTabId | null>(null)
    const menuRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
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
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', tabId)
    }

    const handleDragOver = (tabId: WorkspaceTabId, e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOverTabId !== tabId) {
            setDragOverTabId(tabId)
        }
    }

    const handleDrop = (targetTabId: WorkspaceTabId, e: React.DragEvent) => {
        e.preventDefault()
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
        setDragOverTabId(null)
    }

    const handleDragEnd = () => {
        draggedTabRef.current = null
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
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        title="Add view tab"
                        className={cn(
                            'p-1.5 text-[#6E6E6E] hover:text-[#D4D4D8] hover:bg-[#1C1C1E] rounded-lg transition-colors outline-none cursor-pointer',
                            isMenuOpen && 'bg-[#1C1C1E] text-[#D4D4D8]'
                        )}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#1A1A1C] border border-[#2A2A2D] rounded-xl shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                            <div className="flex flex-col max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10">
                                {ALL_TAB_DEFS.map((def) => {
                                    return (
                                        <button
                                            key={def.id}
                                            type="button"
                                            onClick={() => {
                                                onAddTab(def.id)
                                                setIsMenuOpen(false)
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export const OutputHeaderViewTabs = WorkspaceHeaderViewTabs
