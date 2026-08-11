import React from 'react'

import { CodeWorkspace } from './CodeWorkspace'
import { PreviewArea } from './PreviewArea'
import { TerminalWorkspace } from './TerminalWorkspace'
import { WorkspaceHeader } from './WorkspaceHeader'

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
            <WorkspaceHeader
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                device={device}
                setDevice={setDevice}
                isSidebarCollapsed={isChatSidebarCollapsed}
                onToggleSidebar={onToggleSidebar}
                onOpenNewTab={onOpenInNewTab}
                onBack={onBack}
                projectName={projectName}
                projectId={projectId}
                versions={versions}
                activeVersionId={activeVersionId}
                isVersionLoading={isVersionLoading}
                onSelectVersion={onSelectVersion}
                onDownload={onDownload}
                onRefresh={onRefresh}
            />

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
