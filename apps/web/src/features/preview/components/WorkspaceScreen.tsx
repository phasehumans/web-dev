import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Check,
    Download,
    ExternalLink,
    Flag,
    LogOut,
    MessageSquare,
    MoreHorizontal,
    Pencil,
    RotateCw,
    Tag,
} from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { BadSessionModal } from './BadSessionModal'
import { ChangesWorkspace } from './ChangesWorkspace'
import { CodeWorkspace } from './CodeWorkspace'
import { ExitConfirmModal } from './ExitConfirmModal'
import { OutputScreenMainContent } from './OutputScreenMainContent'
import { PreviewArea } from './PreviewArea'
import { TasksWorkspace } from './TasksWorkspace'
import { TerminalWorkspace } from './TerminalWorkspace'
import { WorkspaceHeader } from './WorkspaceHeader'

import type { WorkspaceScreenProps } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { useBillingOverview } from '@/features/billing/hooks/useBillingData'
import { ChatThread as ChatSidebar } from '@/features/chat/components/ChatThread'
import { useOutputScreenController } from '@/features/preview/hooks/useOutputScreenController'
import { sessionAPI } from '@/features/sessions/api/session'
import { SessionTagsModal } from '@/features/sessions/components/SessionTagsModal'
import { Icons } from '@/shared/components/ui/Icons'
import { Modal } from '@/shared/components/ui/Modal'

type MobileWorkspaceTab = 'chat' | 'changes' | 'desktop' | 'editor' | 'shell' | 'tasks'

const ChangesTabIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
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

const DesktopTabIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
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

const ShellTabIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        className={className}
    >
        <polyline points="3 4.5 7 8 3 11.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8.5" y1="12" x2="13" y2="12" strokeLinecap="round" />
    </svg>
)

const MOBILE_WORKSPACE_TABS: Array<{
    id: MobileWorkspaceTab
    label: string
    icon: React.ReactNode
}> = [
    {
        id: 'chat',
        label: 'Chat',
        icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
        id: 'changes',
        label: 'Changes',
        icon: <ChangesTabIcon />,
    },
    {
        id: 'desktop',
        label: 'Desktop',
        icon: <DesktopTabIcon />,
    },
    {
        id: 'shell',
        label: 'Shell',
        icon: <ShellTabIcon />,
    },
]

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
        isAuthenticated,
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

    const { data: overview } = useBillingOverview(Boolean(isAuthenticated))

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
            setActiveTab('editor')
            setMobileActiveTab('changes')
            if (onOpenFile) {
                onOpenFile(path)
            }
        },
        [setActiveTab, onOpenFile]
    )

    const [isMobileEditingTitle, setIsMobileEditingTitle] = React.useState(false)
    const [mobileTitleInput, setMobileTitleInput] = React.useState('')
    const [isMobileTagModalOpen, setIsMobileTagModalOpen] = React.useState(false)
    const [isMobileUpdatingTag, setIsMobileUpdatingTag] = React.useState(false)
    const [isMobileBadSessionModalOpen, setIsMobileBadSessionModalOpen] = React.useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
    const mobileMenuRef = React.useRef<HTMLDivElement | null>(null)
    const [mobileActiveTab, setMobileActiveTab] = React.useState<MobileWorkspaceTab>('chat')

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
                setIsMobileMenuOpen(false)
            }
        }
        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [isMobileMenuOpen])

    const startMobileEditingTitle = () => {
        setMobileTitleInput(displayProjectName || 'new session')
        setIsMobileEditingTitle(true)
        setIsMobileMenuOpen(false)
    }

    const handleSaveMobileTitle = async () => {
        const trimmed = mobileTitleInput.trim()
        setIsMobileEditingTitle(false)
        if (!trimmed || trimmed === displayProjectName || !projectId) return

        useAppStore.getState().setActiveProjectName(trimmed)

        queryClient.setQueryData(['session', projectId], (old: any) =>
            old ? { ...old, title: trimmed } : { id: projectId, title: trimmed }
        )
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s && s.id === projectId ? { ...s, title: trimmed } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s && s.id === projectId ? { ...s, title: trimmed } : s
                    ),
                }
            }
            return old
        })

        try {
            await sessionAPI.renameSession(projectId, trimmed)
        } catch (error) {
            console.error('Failed to rename session', error)
        } finally {
            queryClient.invalidateQueries({ queryKey: ['session', projectId] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
    }

    const handleSaveMobileTag = async (tags: string[]) => {
        if (!projectId) return
        setIsMobileUpdatingTag(true)

        queryClient.setQueryData(['session', projectId], (old: any) =>
            old ? { ...old, tags } : { id: projectId, tags }
        )
        queryClient.setQueriesData({ queryKey: ['sessions'] }, (old: any) => {
            if (!old) return old
            if (Array.isArray(old)) {
                return old.map((s) => (s && s.id === projectId ? { ...s, tags } : s))
            }
            if (Array.isArray(old.sessions)) {
                return {
                    ...old,
                    sessions: old.sessions.map((s: any) =>
                        s && s.id === projectId ? { ...s, tags } : s
                    ),
                }
            }
            return old
        })
        setIsMobileTagModalOpen(false)

        try {
            await sessionAPI.updateSessionTags(projectId, tags)
        } catch (error) {
            console.error('Failed to update session tags', error)
        } finally {
            setIsMobileUpdatingTag(false)
            queryClient.invalidateQueries({ queryKey: ['session', projectId] })
            queryClient.invalidateQueries({ queryKey: ['sessions'] })
        }
    }

    const setIsMobileSidebarOpen = useAppStore((state) => state.setIsMobileSidebarOpen)

    return (
        <div className="w-full h-full bg-black text-white font-sans overflow-hidden relative">
            {/* Mobile View */}
            <div className="md:hidden flex h-full min-h-0 flex-col bg-[#141414]">
                {/* Mobile Top Header: SidebarToggle, Session Name, PR Tag, 3 Dots */}
                <header className="h-11 flex items-center justify-between px-3 bg-[#141414] border-b border-[#222225] shrink-0 z-40 gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Collapse / Sidebar Button */}
                        <button
                            type="button"
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="p-1 -ml-1 text-[#91908F] hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer outline-none"
                            title="Open sidebar"
                            aria-label="Open sidebar"
                        >
                            <Icons.SidebarToggle className="w-4 h-4" />
                        </button>

                        {/* Session Name (tap or double-tap to edit) */}
                        {isMobileEditingTitle ? (
                            <input
                                type="text"
                                autoFocus
                                value={mobileTitleInput}
                                onChange={(e) => setMobileTitleInput(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveMobileTitle()
                                    if (e.key === 'Escape') setIsMobileEditingTitle(false)
                                }}
                                onBlur={handleSaveMobileTitle}
                                className="text-[13px] font-normal text-white bg-[#141414] border border-[#87B2F4] rounded px-1.5 py-0.5 outline-none ring-1 ring-[#87B2F4]/30 max-w-[140px] truncate"
                            />
                        ) : (
                            <span
                                onClick={startMobileEditingTitle}
                                className="text-[13px] font-normal lowercase text-[#D6D5D4] hover:text-white hover:bg-[#222225] px-1.5 py-0.5 rounded transition-colors cursor-pointer truncate max-w-[130px] sm:max-w-[180px] tracking-tight select-none"
                                title="Click to rename"
                            >
                                {displayProjectName.toLowerCase()}
                            </span>
                        )}

                        {/* PR / Session Tag */}
                        {sessionTag && (
                            <span
                                onClick={() => setIsMobileTagModalOpen(true)}
                                className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-medium text-[#949494] bg-[#262626] border-none shrink-0 select-none cursor-pointer hover:text-white hover:bg-[#303030] transition-colors"
                                title="Click to edit tag"
                            >
                                {sessionTag}
                            </span>
                        )}
                    </div>

                    {/* 3 Dots Menu Button */}
                    <div className="relative shrink-0" ref={mobileMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`p-1.5 rounded-md text-[#91908F] hover:text-white hover:bg-white/5 transition-colors outline-none cursor-pointer flex items-center justify-center ${
                                isMobileMenuOpen ? 'text-white bg-white/5' : ''
                            }`}
                            title="More options"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* 3 Dots Dropdown Menu */}
                        {isMobileMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-[200px] bg-[#1E1E1E] border border-[#272727] rounded-xl shadow-2xl z-50 p-1.5 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 select-none">
                                <button
                                    type="button"
                                    onClick={startMobileEditingTitle}
                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                    <span>Rename session</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        setIsMobileTagModalOpen(true)
                                    }}
                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                                >
                                    <Tag className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                    <span>Edit tags</span>
                                </button>

                                {onDownload && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false)
                                            onDownload()
                                        }}
                                        className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                        <span>Download project</span>
                                    </button>
                                )}

                                <div className="h-[1px] bg-[#272727] my-1" />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        setIsMobileBadSessionModalOpen(true)
                                    }}
                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#EDEDEF] hover:bg-white/5 hover:text-white transition-colors text-left outline-none cursor-pointer"
                                >
                                    <Flag className="w-3.5 h-3.5 text-[#8E8D8C] shrink-0" />
                                    <span>Report issue</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false)
                                        handleTriggerExit()
                                    }}
                                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left outline-none cursor-pointer"
                                >
                                    <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    <span>Exit session</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Mobile Tabs Bar directly below Header */}
                <div className="shrink-0 bg-[#141414] border-b border-[#222225] px-3 py-1.5 z-30">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-start">
                        {MOBILE_WORKSPACE_TABS.map((tab) => {
                            const isActive = mobileActiveTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setMobileActiveTab(tab.id)}
                                    className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-normal transition-colors outline-none select-none relative cursor-pointer border-none shrink-0 w-auto ${
                                        isActive
                                            ? 'bg-[#202020] text-white shadow-none font-medium'
                                            : 'bg-transparent text-[#91908F] hover:text-[#EDEDED] hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <span
                                        className={`transition-colors flex items-center justify-center shrink-0 ${
                                            isActive
                                                ? 'text-white'
                                                : 'text-[#91908F] group-hover:text-[#EDEDED]'
                                        }`}
                                    >
                                        {tab.icon}
                                    </span>
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Mobile Workspace Content Area */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {/* Chat Tab */}
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
                            projectName={displayProjectName}
                            generatedFiles={activeFilesToDisplay}
                            projectType={projectType}
                            onOpenFile={handleOpenFileWrapper}
                            projectId={projectId}
                            activeVersionId={activeVersionId}
                        />
                    </div>

                    {/* Changes Tab */}
                    {mobileActiveTab === 'changes' && (
                        <div className="h-full min-h-0 flex flex-col">
                            <ChangesWorkspace />
                        </div>
                    )}

                    {/* Desktop Tab */}
                    <div
                        className={
                            mobileActiveTab === 'desktop'
                                ? 'h-full min-h-0 flex flex-col'
                                : 'hidden h-full min-h-0 flex flex-col'
                        }
                    >
                        {/* Mobile Desktop Top Control Bar */}
                        <div className="h-9 px-3 bg-[#181818] border-b border-[#242323] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11.5px] font-medium text-[#D6D5C9]">
                                    Live Preview
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleRefreshPreview}
                                    className="p-1.5 rounded-md text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-white/5 transition-colors cursor-pointer"
                                    title="Refresh Preview"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={handleOpenInNewTab}
                                    className="p-1.5 rounded-md text-[#7B7A79] hover:text-[#D6D5C9] hover:bg-white/5 transition-colors cursor-pointer"
                                    title="Open in New Tab"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative">
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

                    {/* Editor Tab */}
                    {mobileActiveTab === 'editor' && (
                        <div className="h-full min-h-0 flex flex-col">
                            <CodeWorkspace
                                html={previewHtml}
                                generatedFiles={activeFilesToDisplay}
                                activeFilePath={activeGeneratedFilePath}
                                onHtmlChange={setPreviewHtml}
                            />
                        </div>
                    )}

                    {/* Shell Tab */}
                    <div
                        className={
                            mobileActiveTab === 'shell'
                                ? 'h-full min-h-0 flex flex-col'
                                : 'hidden h-full min-h-0 flex flex-col'
                        }
                    >
                        <TerminalWorkspace
                            previewSessionId={previewSession?.previewId}
                            generatedFiles={activeFilesToDisplay}
                        />
                    </div>

                    {/* Tasks Tab */}
                    {mobileActiveTab === 'tasks' && (
                        <div className="h-full min-h-0 flex flex-col">
                            <TasksWorkspace generatedFiles={activeFilesToDisplay} />
                        </div>
                    )}
                </div>

                {/* Session Tag Management Modal for Mobile */}
                <SessionTagsModal
                    isOpen={isMobileTagModalOpen}
                    session={{
                        id: projectId,
                        title: displayProjectName,
                        tags: sessionTag ? [sessionTag] : [],
                    }}
                    isPending={isMobileUpdatingTag}
                    onClose={() => setIsMobileTagModalOpen(false)}
                    onSave={handleSaveMobileTag}
                />

                {/* Bad Session Modal for Mobile */}
                <BadSessionModal
                    isOpen={isMobileBadSessionModalOpen}
                    onClose={() => setIsMobileBadSessionModalOpen(false)}
                    sessionId={projectId}
                    projectName={displayProjectName}
                />
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
