import { ArrowLeft } from 'lucide-react'
import React from 'react'

import { WorkspaceHeaderActions } from './WorkspaceHeaderActions'

import type { WorkspaceHeaderProps } from '@/features/preview/types'

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    isSidebarCollapsed,
    onToggleSidebar,
    isPreviewCollapsed,
    onTogglePreview,
    onBack,
    projectName,
    projectId,
    versions,
    activeVersionId,
    isVersionLoading,
    onSelectVersion,
    onDownload,
}) => {
    const versionDisplay = activeVersionId ? `#${activeVersionId.slice(0, 4)}` : '#1'

    return (
        <header className="h-11 flex items-center justify-between px-3.5 bg-[#141414] border-b border-[#222225] shrink-0 z-[45] gap-3 w-full">
            <div className="flex items-center gap-2 min-w-0">
                {onBack && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onBack()
                        }}
                        className="p-1 rounded-md text-[#91908F] hover:text-white hover:bg-white/5 transition-colors shrink-0 outline-none"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                )}
                <span
                    className="text-[14px] font-semibold text-[#EDEDEF] truncate max-w-[280px] sm:max-w-[400px] tracking-tight"
                    title={projectName ? projectName.toLowerCase() : 'new session'}
                >
                    {projectName ? projectName.toLowerCase() : 'new session'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono text-[#91908F] bg-[#1A1A1C] border border-[#2A2A2D] shrink-0">
                    {versionDisplay}
                </span>
            </div>

            <WorkspaceHeaderActions
                projectName={projectName}
                projectId={projectId}
                versions={versions}
                activeVersionId={activeVersionId}
                isVersionLoading={isVersionLoading}
                onSelectVersion={onSelectVersion}
                onDownload={onDownload}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                isPreviewCollapsed={isPreviewCollapsed}
                onTogglePreview={onTogglePreview}
            />
        </header>
    )
}

export const OutputHeader = WorkspaceHeader
