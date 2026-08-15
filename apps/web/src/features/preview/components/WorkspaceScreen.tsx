import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { ExitConfirmModal } from './ExitConfirmModal'
import { OutputScreenMainContent } from './OutputScreenMainContent'
import { PreviewArea } from './PreviewArea'
import { WorkspaceHeader } from './WorkspaceHeader'

import type { WorkspaceScreenProps } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { billingAPI } from '@/features/billing/api/billing'
import { ChatThread as ChatSidebar } from '@/features/chat/components/ChatThread'
import { useOutputScreenController } from '@/features/preview/hooks/useOutputScreenController'
import { sessionAPI } from '@/features/sessions/api/session'
import { Modal } from '@/shared/components/ui/Modal'

type MobileOutputTab = 'chat' | 'preview'

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
    onBack,
    onPromptSubmit,
    onRuntimeError,
    showStructureOnly = false,
    onSelectVersion,
    onDownload,
    onOpenFile,
}) => {
    const navigate = useNavigate()
    const {
        messages,
        generatedFiles,
        currentGenerationFilePaths,
        activeGeneratedFilePath,
        generationPhase,
        activeOperation,
        isGenerating,
        activeProjectName: projectName,
        activeProjectId: projectId,
        projectVersions: versions,
        activeProjectVersionId: activeVersionId,
        isProjectOpening: isVersionLoading,
        previewSession,
        previewSessionError,
        importState,
        projectType = 'generated',
    } = useAppStore()

    const activeFilesToDisplay = React.useMemo(() => {
        if (!currentGenerationFilePaths || currentGenerationFilePaths.length === 0)
            return generatedFiles
        const filtered: Record<string, any> = {}
        for (const path of currentGenerationFilePaths) {
            if (generatedFiles[path]) filtered[path] = generatedFiles[path]
        }
        return filtered
    }, [generatedFiles, currentGenerationFilePaths])

    const queryClient = useQueryClient()
    const { data: currentSession } = useQuery({
        queryKey: ['session', projectId],
        queryFn: () => (projectId ? sessionAPI.getSession(projectId) : null),
        enabled: Boolean(projectId),
    })

    const displayProjectName = currentSession?.title || projectName

    const sessionTag = React.useMemo(() => {
        if (
            currentSession &&
            Array.isArray(currentSession.tags) &&
            currentSession.tags.length > 0
        ) {
            return currentSession.tags[0]
        }
        const matchingQueries = queryClient.getQueriesData<any>({ queryKey: ['sessions'] })
        for (const [, qData] of matchingQueries) {
            const list = Array.isArray(qData)
                ? qData
                : Array.isArray(qData?.sessions)
                  ? qData.sessions
                  : []
            const found = list.find((s: any) => s && s.id === projectId)
            if (found && Array.isArray(found.tags) && found.tags.length > 0) {
                return found.tags[0]
            }
        }
        if (activeVersionId) {
            return `#${activeVersionId.slice(0, 4)}`
        }
        return 'main'
    }, [currentSession, projectId, queryClient, activeVersionId])

    const { data: overview } = useQuery({
        queryKey: ['billing-overview'],
        queryFn: billingAPI.getOverview,
        staleTime: 10 * 1000,
    })

    const remainingInCents = (overview as any)?.credits?.remainingInCents ?? 100
    const unlimited = (overview as any)?.credits?.unlimited ?? false

    const isOutOfCredits = !unlimited && overview !== undefined && remainingInCents === 0
    const showLowCreditsWarning = !unlimited && remainingInCents > 0 && remainingInCents < 10

    const {
        activeTab,
        setActiveTab,
        device,
        setDevice,
        previewHtml,
        setPreviewHtml,
        isVisualMode,
        setIsVisualMode,
        selectedElement,
        editPrompt,
        setEditPrompt,
        isApplyingEdit,
        isChatSidebarCollapsed,
        setIsChatSidebarCollapsed,
        steps,
        isThoughtsOpen,
        setIsThoughtsOpen,
        executionTime,
        iframeRef,
        handleIframeMessage,
        handleApplyEdit,
        handleClearSelection,
        handleOpenInNewTab,
        handleRefreshPreview,
    } = useOutputScreenController({
        isGenerating,
        generatedFiles,
        activeGeneratedFilePath,
        generationPhase,
        activeOperation,
        onPromptSubmit,
        onRuntimeError,
        previewSession,
    })

    const [mobileActiveTab, setMobileActiveTab] = React.useState<MobileOutputTab>('chat')
    const [showExitModal, setShowExitModal] = React.useState(false)
    const [chatWidth, setChatWidth] = React.useState<number | undefined>(undefined)
    const [isResizingChat, setIsResizingChat] = React.useState(false)
    const [isPreviewPanelCollapsed, setIsPreviewPanelCollapsed] = React.useState(false)
    const chatWidthRef = React.useRef(chatWidth)

    React.useEffect(() => {
        chatWidthRef.current = chatWidth
    }, [chatWidth])

    const handleResizeMouseDown = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizingChat(true)
        const startX = e.clientX
        const resizer = e.currentTarget as HTMLElement
        const chatElement = resizer.previousElementSibling as HTMLElement
        const measuredWidth = chatElement ? chatElement.getBoundingClientRect().width : 380
        const startWidth = chatWidthRef.current ?? measuredWidth

        const handleMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault()
            const deltaX = moveEvent.clientX - startX
            const maxAllowedWidth = Math.floor(window.innerWidth * 0.45)
            const newWidth = Math.min(Math.max(startWidth + deltaX, 260), maxAllowedWidth)
            setChatWidth(newWidth)
        }

        const handleMouseUp = () => {
            setIsResizingChat(false)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }, [])

    const handleTriggerExit = React.useCallback(() => {
        setShowExitModal(true)
    }, [])

    const handleConfirmExit = React.useCallback(() => {
        if (onBack) onBack()
    }, [onBack])

    const handleOpenFileWrapper = React.useCallback(
        (path: string) => {
            setActiveTab('code')
            if (onOpenFile) {
                onOpenFile(path)
            }
        },
        [setActiveTab, onOpenFile]
    )

    return (
        <div className="w-full h-full bg-black text-white font-sans overflow-hidden relative">
            <div className="md:hidden flex h-full min-h-0 flex-col bg-[#141414]">
                <div className="flex-1 min-h-0 px-2 pt-2 pb-2 overflow-hidden">
                    <div
                        className={
                            mobileActiveTab === 'chat' ? 'h-full min-h-0' : 'hidden h-full min-h-0'
                        }
                    >
                        <ChatSidebar
                            mode="mobile"
                            messages={messages}
                            onPromptSubmit={(prompt) => {
                                if (isOutOfCredits) return
                                void onPromptSubmit(prompt)
                            }}
                            onBack={handleTriggerExit}
                            isGenerating={isGenerating}
                            steps={steps}
                            executionTime={executionTime}
                            isThoughtsOpen={isThoughtsOpen}
                            setIsThoughtsOpen={setIsThoughtsOpen}
                            editPrompt={editPrompt}
                            setEditPrompt={setEditPrompt}
                            handleApplyEdit={() => {
                                void handleApplyEdit()
                            }}
                            isVisualMode={isVisualMode}
                            setIsVisualMode={setIsVisualMode}
                            selectedElement={selectedElement}
                            handleClearSelection={handleClearSelection}
                            isApplyingEdit={isApplyingEdit}
                            isCollapsed={false}
                            onClose={() => {}}
                            projectName={projectName}
                            generatedFiles={activeFilesToDisplay}
                            projectType={projectType}
                            onOpenFile={handleOpenFileWrapper}
                            projectId={projectId}
                        />
                    </div>

                    <div
                        className={
                            mobileActiveTab === 'preview'
                                ? 'h-full min-h-0 flex'
                                : 'hidden h-full min-h-0 flex'
                        }
                    >
                        <PreviewArea
                            html={previewHtml}
                            isGenerating={isGenerating}
                            device="desktop"
                            isVisualMode={isVisualMode}
                            onMessage={handleIframeMessage}
                            iframeRef={iframeRef}
                            fullscreen
                            showStructureOnly={showStructureOnly}
                            previewUrl={previewSession?.previewUrl}
                            previewState={previewSession?.state ?? null}
                            previewError={previewSession?.lastError ?? null}
                            previewSessionError={
                                importState.status === 'failed'
                                    ? importState.message || 'Import failed'
                                    : previewSessionError
                            }
                            projectType={projectType}
                            projectId={projectId}
                        />
                    </div>
                </div>

                <div className="shrink-0 px-2 pb-2">
                    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-[#141414] p-1">
                        <button
                            onClick={() => setMobileActiveTab('chat')}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                mobileActiveTab === 'chat'
                                    ? 'bg-[#2B2B2B] text-white'
                                    : 'text-[#91908F] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setMobileActiveTab('preview')}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                mobileActiveTab === 'preview'
                                    ? 'bg-[#2B2B2B] text-white'
                                    : 'text-[#91908F] hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Preview
                        </button>
                    </div>
                </div>
            </div>

            <div className="hidden md:flex flex-col w-full h-full overflow-hidden relative bg-[#141414]">
                {/* Main Top Header spanning 100% full width */}
                <WorkspaceHeader
                    onBack={handleTriggerExit}
                    projectName={displayProjectName}
                    projectId={projectId}
                    versions={versions}
                    activeVersionId={activeVersionId}
                    isVersionLoading={isVersionLoading}
                    onSelectVersion={onSelectVersion}
                    onDownload={onDownload}
                    isSidebarCollapsed={isChatSidebarCollapsed}
                    onToggleSidebar={() => setIsChatSidebarCollapsed(!isChatSidebarCollapsed)}
                    isPreviewCollapsed={isPreviewPanelCollapsed}
                    onTogglePreview={() => setIsPreviewPanelCollapsed(!isPreviewPanelCollapsed)}
                    sessionTag={sessionTag}
                />

                {/* Content Split Area below Main Top Header */}
                <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
                    <ChatSidebar
                        messages={messages}
                        onPromptSubmit={(prompt) => {
                            if (isOutOfCredits) return
                            void onPromptSubmit(prompt)
                        }}
                        onBack={handleTriggerExit}
                        isGenerating={isGenerating}
                        steps={steps}
                        executionTime={executionTime}
                        isThoughtsOpen={isThoughtsOpen}
                        setIsThoughtsOpen={setIsThoughtsOpen}
                        editPrompt={editPrompt}
                        setEditPrompt={setEditPrompt}
                        handleApplyEdit={() => {
                            void handleApplyEdit()
                        }}
                        isVisualMode={isVisualMode}
                        setIsVisualMode={setIsVisualMode}
                        selectedElement={selectedElement}
                        handleClearSelection={handleClearSelection}
                        isApplyingEdit={isApplyingEdit}
                        isCollapsed={isChatSidebarCollapsed}
                        onClose={() => setIsChatSidebarCollapsed(true)}
                        projectName={displayProjectName}
                        generatedFiles={activeFilesToDisplay}
                        projectType={projectType}
                        onOpenFile={handleOpenFileWrapper}
                        projectId={projectId}
                        customWidth={chatWidth}
                        isDragging={isResizingChat}
                        isPreviewCollapsed={isPreviewPanelCollapsed}
                        onTogglePreview={() => setIsPreviewPanelCollapsed(!isPreviewPanelCollapsed)}
                        activeVersionId={activeVersionId}
                    />

                    {/* Resizer Handle */}
                    {!isChatSidebarCollapsed && !isPreviewPanelCollapsed && (
                        <div
                            onMouseDown={handleResizeMouseDown}
                            className="w-[1px] hover:w-1 bg-[#222225] hover:bg-[#3B82F6] active:bg-[#3B82F6] transition-all cursor-col-resize h-full flex items-center justify-center shrink-0 z-30 group select-none"
                            title="Drag to resize chat panel"
                        >
                            <div className="w-[1.5px] h-8 rounded-full bg-[#363539] group-hover:bg-white group-active:bg-white transition-colors" />
                        </div>
                    )}

                    {/* Fullscreen overlay to capture mouse movements smoothly during resizing */}
                    {isResizingChat && (
                        <div className="fixed inset-0 z-[9999] cursor-col-resize select-none bg-transparent" />
                    )}

                    {!isPreviewPanelCollapsed && (
                        <OutputScreenMainContent
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            device={device}
                            setDevice={setDevice}
                            isChatSidebarCollapsed={isChatSidebarCollapsed}
                            onToggleSidebar={() =>
                                setIsChatSidebarCollapsed(!isChatSidebarCollapsed)
                            }
                            isPreviewCollapsed={isPreviewPanelCollapsed}
                            onTogglePreview={() =>
                                setIsPreviewPanelCollapsed(!isPreviewPanelCollapsed)
                            }
                            onOpenInNewTab={handleOpenInNewTab}
                            onBack={handleTriggerExit}
                            previewHtml={previewHtml}
                            setPreviewHtml={setPreviewHtml}
                            generatedFiles={activeFilesToDisplay}
                            activeGeneratedFilePath={activeGeneratedFilePath}
                            isGenerating={isGenerating}
                            isVisualMode={isVisualMode}
                            iframeRef={iframeRef}
                            onIframeMessage={handleIframeMessage}
                            showStructureOnly={showStructureOnly}
                            projectName={projectName}
                            projectId={projectId}
                            versions={versions}
                            activeVersionId={activeVersionId}
                            isVersionLoading={isVersionLoading}
                            onSelectVersion={onSelectVersion}
                            onDownload={onDownload}
                            previewSession={previewSession}
                            previewSessionError={
                                importState.status === 'failed'
                                    ? importState.message || 'Import failed'
                                    : previewSessionError
                            }
                            projectType={projectType}
                            onRefresh={handleRefreshPreview}
                        />
                    )}
                </div>
            </div>

            {/* low credits warning toast */}
            {showLowCreditsWarning && !isOutOfCredits && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-xl text-sm font-medium shadow-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Low Credits! You have less than $0.10 remaining.
                </div>
            )}
            {/* out of credits upgrade card overlay */}
            <Modal
                isOpen={isOutOfCredits}
                onClose={handleTriggerExit}
                title="Out of Credits"
                description="You have used all your credits. Add credits to your account balance to resume your project development."
                variant="premium"
            >
                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-3 px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                            </div>
                            <span className="text-[13px] text-[#D6D5C9]">
                                Pay-as-you-go: Only pay for the tokens you actually use
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                            </div>
                            <span className="text-[13px] text-[#D6D5C9]">
                                Priority execution and full model access
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 text-[#D6D5C9]" />
                            </div>
                            <span className="text-[13px] text-[#D6D5C9]">
                                Top up instantly via UPI QR, Cards, or Crypto
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        <button
                            onClick={() => {
                                navigate('/settings/billing')
                            }}
                            className="w-full py-2.5 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-[#E5E5E5] transition-colors focus:outline-none"
                        >
                            Add Credits
                        </button>
                        <button
                            onClick={handleTriggerExit}
                            className="text-[11px] text-[#7B7A79] text-center hover:text-white transition-colors cursor-pointer outline-none w-full"
                        >
                            Cancel and Exit
                        </button>
                    </div>
                </div>
            </Modal>

            <ExitConfirmModal
                isOpen={showExitModal}
                onClose={() => setShowExitModal(false)}
                onConfirm={handleConfirmExit}
            />
        </div>
    )
}

export const OutputScreen = WorkspaceScreen
