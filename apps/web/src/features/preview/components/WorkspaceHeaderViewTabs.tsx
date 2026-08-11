import { ChevronLeft } from 'lucide-react'
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
    onSelect: (tab: PreviewTab) => void
}> = ({ label, tab, activeTab, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(tab)}
            className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
                activeTab === tab
                    ? 'bg-[#141414] hover:bg-[#191919] text-white border-[#363534]'
                    : 'text-[#91908F] border-transparent hover:text-white hover:bg-white/5'
            )}
        >
            {label}
        </button>
    )
}

export const WorkspaceHeaderViewTabs: React.FC<WorkspaceHeaderViewTabsProps> = ({
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    onToggleSidebar,
    onBack,
}) => {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onBack}
                className="md:hidden p-1.5 text-[#91908F] hover:text-white mr-2"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="hidden md:flex items-center gap-2">
                <ViewModeTab
                    label="Preview"
                    tab="preview"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                <ViewModeTab
                    label="Canvas"
                    tab="canvas"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                <ViewModeTab
                    label="Code"
                    tab="code"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
                <ViewModeTab
                    label="Terminal"
                    tab="terminal"
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                />
            </div>
        </div>
    )
}

export const OutputHeaderViewTabs = WorkspaceHeaderViewTabs
