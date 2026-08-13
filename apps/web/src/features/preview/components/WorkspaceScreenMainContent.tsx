import { Maximize2, Minimize2 } from 'lucide-react'
import React from 'react'

import { ChangesWorkspace } from './ChangesWorkspace'
import { CodeWorkspace } from './CodeWorkspace'
import { PreviewArea } from './PreviewArea'
import { TasksWorkspace } from './TasksWorkspace'
import { TerminalWorkspace } from './TerminalWorkspace'
import { ALL_TAB_DEFS, WorkspaceHeaderViewTabs } from './WorkspaceHeaderViewTabs'

import type { WorkspaceTabId } from './WorkspaceHeaderViewTabs'
import type {
    GeneratedProjectFile,
    PreviewDevice,
    PreviewSessionStatus,
} from '@/features/preview/types'
import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'

import { cn } from '@/shared/lib/utils'

interface WorkspaceScreenMainContentProps {
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
    device,
    isChatSidebarCollapsed,
    onToggleSidebar,
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
    projectId,
    previewSession,
    previewSessionError,
    projectType,
}) => {
    const [openTabs, setOpenTabs] = React.useState<WorkspaceTabId[]>([
        'changes',
        'desktop',
        'shell',
    ])
    const [activeTab, setActiveTab] = React.useState<WorkspaceTabId>('desktop')

    const handleCloseTab = (tabId: WorkspaceTabId) => {
        if (openTabs.length <= 1) return
        const nextTabs = openTabs.filter((id) => id !== tabId)
        setOpenTabs(nextTabs)
        if (activeTab === tabId) {
            const closingIndex = openTabs.indexOf(tabId)
            const fallbackTab = nextTabs[closingIndex] || nextTabs[closingIndex - 1] || nextTabs[0]
            setActiveTab(fallbackTab)
        }
    }

    const handleAddTab = (tabId: WorkspaceTabId) => {
        if (!openTabs.includes(tabId)) {
            setOpenTabs((prev) => [...prev, tabId])
        }
        setActiveTab(tabId)
    }

    const activeDef = ALL_TAB_DEFS.find((t) => t.id === activeTab)

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] relative overflow-hidden min-h-0">
            <div
                className={cn(
                    'h-10 flex items-center justify-between px-3 bg-[#141414] shrink-0 z-[40]',
                    activeTab === 'editor' && 'border-b border-[#222225]'
                )}
            >
                <WorkspaceHeaderViewTabs
                    openTabs={openTabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onCloseTab={handleCloseTab}
                    onAddTab={handleAddTab}
                    onReorderTabs={setOpenTabs}
                    onBack={onBack}
                />

                <button
                    type="button"
                    onClick={onToggleSidebar}
                    title={
                        isChatSidebarCollapsed
                            ? 'Show Chat Section'
                            : 'Expand Workspace (Hide Chat)'
                    }
                    className="p-1.5 text-[#91908F] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer outline-none"
                >
                    {isChatSidebarCollapsed ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
            </div>

            {activeTab === 'desktop' && (
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

            {activeTab === 'editor' && (
                <CodeWorkspace
                    html={previewHtml}
                    generatedFiles={generatedFiles}
                    activeFilePath={activeGeneratedFilePath}
                    onHtmlChange={setPreviewHtml}
                />
            )}

            {activeTab === 'changes' && <ChangesWorkspace />}

            {activeTab === 'shell' && (
                <TerminalWorkspace previewSessionId={previewSession?.previewId} />
            )}

            {activeTab === 'tasks' && <TasksWorkspace />}

            {activeTab !== 'desktop' &&
                activeTab !== 'editor' &&
                activeTab !== 'changes' &&
                activeTab !== 'shell' &&
                activeTab !== 'tasks' && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#141414] text-[#8E8D8C] select-none p-6 font-sans w-full h-full">
                        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
                            <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1AA]">
                                {activeDef?.icon}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] font-semibold text-[#EDEDEF]">
                                    {activeDef?.label} View
                                </span>
                                <span className="text-[12px] text-[#8E8D8C]">
                                    Workspace options and details for{' '}
                                    {activeDef?.label.toLowerCase()} will appear here.
                                </span>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    )
}

export const OutputScreenMainContent = WorkspaceScreenMainContent
