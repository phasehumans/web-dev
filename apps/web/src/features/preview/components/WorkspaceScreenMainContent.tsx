import React from 'react'

import { CodeWorkspace } from './CodeWorkspace'
import { PreviewArea } from './PreviewArea'
import { TerminalWorkspace } from './TerminalWorkspace'
import { WorkspaceHeaderViewTabs } from './WorkspaceHeaderViewTabs'

import type {
    GeneratedProjectFile,
    PreviewDevice,
    PreviewSessionStatus,
    PreviewTab,
} from '@/features/preview/types'
import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'

interface WorkspaceScreenMainContentProps {
    activeTab: PreviewTab
    setActiveTab: (tab: PreviewTab) => void
    device: PreviewDevice
    setDevice: (device: PreviewDevice) => void
    isChatSidebarCollapsed: boolean
    onToggleSidebar: () => void
    isPreviewCollapsed?: boolean
    onTogglePreview?: () => void
    onOpenInNewTab: () => void
    onBack?: () => void
    previewHtml: string
    setPreviewHtml: (nextHtml: string) => void
    generatedFiles?: Record<string, GeneratedProjectFile>
    activeGeneratedFilePath?: string | null
    isGenerating: boolean
    isVisualMode: boolean
    iframeRef: React.RefObject<HTMLIFrameElement>
    onIframeMessage: (event: MessageEvent) => void
    showStructureOnly: boolean
    projectName?: string | null
    projectId?: string | null
    versions?: BackendProjectVersionSummary[]
    activeVersionId?: string | null
    isVersionLoading?: boolean
    onSelectVersion?: (versionId: string) => void
    onDownload?: () => void
    previewSession?: PreviewSessionStatus | null
    previewSessionError?: string | null
    projectType?: 'generated' | 'github' | 'zip'
    onRefresh?: () => void
}

export const WorkspaceScreenMainContent: React.FC<WorkspaceScreenMainContentProps> = ({
    activeTab,
    setActiveTab,
    device,
    setDevice,
    isChatSidebarCollapsed,
    onToggleSidebar,
    isPreviewCollapsed,
    onTogglePreview,
    onOpenInNewTab,
    onBack,
    previewHtml,
    setPreviewHtml,
    generatedFiles,
    activeGeneratedFilePath,
    isGenerating,
    isVisualMode,
    iframeRef,
    onIframeMessage,
    showStructureOnly,
    projectName,
    projectId,
    versions,
    activeVersionId,
    isVersionLoading,
    onSelectVersion,
    onDownload,
    previewSession,
    previewSessionError,
    projectType,
    onRefresh,
}) => {
    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] relative overflow-hidden min-h-0">
            <div className="h-10 flex items-center justify-between px-3 bg-[#141414] border-b border-[#222225] shrink-0 z-[40]">
                <WorkspaceHeaderViewTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isSidebarCollapsed={isChatSidebarCollapsed}
                    onToggleSidebar={onToggleSidebar}
                    onBack={onBack}
                />
            </div>

            {activeTab === 'preview' && (
                <PreviewArea
                    html={previewHtml}
                    isGenerating={isGenerating}
                    device={device}
                    isVisualMode={isVisualMode}
                    onMessage={onIframeMessage}
                    iframeRef={iframeRef}
                    showStructureOnly={showStructureOnly}
                    previewUrl={previewSession?.previewUrl}
                    previewState={previewSession?.state ?? null}
                    previewError={previewSession?.lastError ?? null}
                    previewSessionError={previewSessionError}
                    projectType={projectType}
                    projectId={projectId}
                />
            )}

            {activeTab === 'code' && (
                <CodeWorkspace
                    html={previewHtml}
                    generatedFiles={generatedFiles}
                    activeFilePath={activeGeneratedFilePath}
                    onHtmlChange={setPreviewHtml}
                />
            )}

            {activeTab === 'terminal' && (
                <TerminalWorkspace previewSessionId={previewSession?.previewId} />
            )}
        </div>
    )
}

export const OutputScreenMainContent = WorkspaceScreenMainContent
