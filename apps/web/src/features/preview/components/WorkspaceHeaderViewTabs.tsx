import { ChevronLeft, Monitor, GitCommit, Terminal as TerminalIcon, Plus } from 'lucide-react'
import React from 'react'

import type { PreviewTab } from '@/features/preview/types'

import { cn } from '@/shared/lib/utils'

interface WorkspaceHeaderViewTabsProps {
    activeTab: PreviewTab
    setActiveTab: (tab: PreviewTab) => void
    isSidebarCollapsed: boolean
    onToggleSidebar: () => void
    onBack?: () => void
}

const ViewModeTab: React.FC<{
    label: string
    tab: PreviewTab
    activeTab: PreviewTab
    icon: React.ReactNode
    onSelect: (tab: PreviewTab) => void
}> = ({ label, tab, activeTab, icon, onSelect }) => {
    const isActive = activeTab === tab
    return (
        <button
            onClick={() => onSelect(tab)}
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border outline-none select-none',
                isActive
                    ? 'bg-[#1E1E20] text-[#EDEDED] border-[#2E2E32] shadow-sm'
                    : 'text-[#8F8E8D] border-transparent hover:text-[#EDEDED] hover:bg-[#18181A]'
            )}
        >
            <span
                className={cn('transition-colors', isActive ? 'text-[#EDEDED]' : 'text-[#8F8E8D]')}
            >
                {icon}
            </span>
            <span>{label}</span>
        </button>
    )
}

export const WorkspaceHeaderViewTabs: React.FC<WorkspaceHeaderViewTabsProps> = ({
    activeTab,
    setActiveTab,
    onBack,
}) => {
    return (
        <div className="flex items-center gap-1.5">
            <button
                onClick={onBack}
                className="md:hidden p-1.5 text-[#91908F] hover:text-white mr-1 rounded-md hover:bg-white/5 transition-colors"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="hidden md:flex items-center gap-1 bg-[#141414] p-0.5 rounded-xl">
                <ViewModeTab
                    label="Preview"
                    tab="preview"
                    activeTab={activeTab}
                    icon={<Monitor className="w-3.5 h-3.5" />}
                    onSelect={setActiveTab}
                />
                <ViewModeTab
                    label="Changes"
                    tab="code"
                    activeTab={activeTab}
                    icon={<GitCommit className="w-3.5 h-3.5" />}
                    onSelect={setActiveTab}
                />
                <ViewModeTab
                    label="Terminal"
                    tab="terminal"
                    activeTab={activeTab}
                    icon={<TerminalIcon className="w-3.5 h-3.5" />}
                    onSelect={setActiveTab}
                />
                <button
                    type="button"
                    title="Add view tab"
                    className="p-1.5 text-[#6E6E6E] hover:text-[#D4D4D8] hover:bg-[#1C1C1E] rounded-lg transition-colors outline-none"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}

export const OutputHeaderViewTabs = WorkspaceHeaderViewTabs
