import React from 'react'

import { WorkspaceHeaderActions } from './WorkspaceHeaderActions'
import { WorkspaceHeaderCenterControls } from './WorkspaceHeaderCenterControls'
import { WorkspaceHeaderViewTabs } from './WorkspaceHeaderViewTabs'

import type { WorkspaceHeaderProps } from '@/features/preview/types'

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    activeTab,
    setActiveTab,
    device,
    setDevice,
    isSidebarCollapsed,
    onToggleSidebar,
    onOpenNewTab,
    onBack,
    projectName,
    projectId,
    versions,
    activeVersionId,
    isVersionLoading,
    onSelectVersion,
    onDownload,
    onRefresh,
}) => {
    return (
        <header className="h-12 flex items-center justify-between px-3 bg-[#141414] backdrop-blur-sm shrink-0 z-[45] gap-3">
            <WorkspaceHeaderViewTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                onBack={onBack}
            />

            <WorkspaceHeaderCenterControls
                device={device}
                setDevice={setDevice}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                onOpenNewTab={onOpenNewTab}
                onRefresh={onRefresh}
            />

            <WorkspaceHeaderActions
                projectName={projectName}
                projectId={projectId}
                versions={versions}
                activeVersionId={activeVersionId}
                isVersionLoading={isVersionLoading}
                onSelectVersion={onSelectVersion}
                onDownload={onDownload}
            />
        </header>
    )
}

export const OutputHeader = WorkspaceHeader
