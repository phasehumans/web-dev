import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store'
import { toProjectSlug, type ViewState } from '@/app/types'
import { createEmptyCanvasDocument } from '@/features/canvas/types'
import { mapBackendMessageToUIMessage } from '@/features/chat/utils'
import { importsAPI, type ProjectImportStatus } from '@/features/home/api'
import { projectAPI } from '@/features/sessions/api/project'

const getImportStatusMessage = (status: ProjectImportStatus) => {
    if (status.errorMessage) return status.errorMessage
    if (status.status === 'PENDING') return 'Queued for import'
    if (status.status === 'VALIDATING') return 'Extracting project archive'
    if (status.status === 'UPLOADING') return 'Uploading project files'
    if (status.status === 'STARTING_RUNTIME') return 'Starting preview runtime'
    if (status.status === 'READY') return 'Preview is ready'
    return 'Import failed'
}

export const useSessionController = (
    view: ViewState,
    abortGenerationRequest: () => void,
    resetGenerationRefs: () => void,
    outputOriginViewRef: React.MutableRefObject<ViewState>
) => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    const {
        activeProjectId,
        activeProjectName,
        activeProjectVersionId,
        setActiveProjectId,
        setActiveProjectName,
        setProjectVersions,
        setActiveProjectVersionId,
        setProjectLoadError,
        setMessages,
        setProjectType,
        setCanvasState,
        replaceGeneratedOutput,
        setGenerationPhase,
        setActiveOperation,
        setIsMobileSidebarOpen,
        setIsProjectOpening,
        isGenerating,
        setIsGenerating,
        isAuthenticated,
        setShowAuthModal,
        setImportState,
        resetGeneratedOutput,
    } = useAppStore()

    const lastSavedCanvasRef = React.useRef<string | null>(null)
    const lastAutoFixSignatureRef = React.useRef<string | null>(null)

    React.useEffect(() => {
        if (!activeProjectId) return

        const handleBeforeUnload = () => {
            const url = `/api/v1/sessions/${activeProjectId}/disconnect`
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url)
            } else {
                fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                const url = `/api/v1/sessions/${activeProjectId}/disconnect`
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(url)
                }
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [activeProjectId])

    const requireAuthOr = React.useCallback(
        (action: () => void) => {
            if (!isAuthenticated) {
                setShowAuthModal(true)
                return
            }
            action()
        },
        [isAuthenticated, setShowAuthModal]
    )

    const hydrateProjectDetail = React.useCallback(
        (detail: any) => {
            const projectOrSession = detail.project || detail.session
            const projectId = projectOrSession?.id
            const projectName = projectOrSession?.name || projectOrSession?.title || 'Session'
            const versions = detail.versions || []
            const selectedVersionId = detail.selectedVersionId || null

            if (!projectId) {
                console.error('[Session] Invalid session or project detail structure:', detail)
                return
            }

            setActiveProjectId(projectId)
            setActiveProjectName(projectName)
            setProjectVersions(versions)
            setActiveProjectVersionId(selectedVersionId)
            setProjectLoadError(null)

            const rawMessages = detail.chatMessages || []
            const uiMessages = rawMessages.map(mapBackendMessageToUIMessage)
            const activeVersionSummary = detail.activeVersion?.summary
            if (activeVersionSummary) {
                const lastAssistantIdx = [...uiMessages]
                    .reverse()
                    .findIndex((m) => m.role === 'assistant')
                if (lastAssistantIdx !== -1) {
                    const idx = uiMessages.length - 1 - lastAssistantIdx
                    if (uiMessages[idx]) {
                        uiMessages[idx].summary = activeVersionSummary
                    }
                }
            }
            setMessages(uiMessages)

            let resolvedType: 'generated' | 'github' | 'zip' = 'generated'
            const firstMsg = uiMessages[0]
            if (firstMsg && firstMsg.role === 'user') {
                const content = firstMsg.content
                if (
                    content.startsWith('Importing GitHub repository') ||
                    content === 'Imported project files'
                ) {
                    resolvedType = 'github'
                } else if (content.startsWith('Uploading ZIP archive')) {
                    resolvedType = 'zip'
                }
            }

            if (resolvedType === 'generated') {
                const projectPrompt = (
                    detail.project?.prompt ||
                    detail.session?.description ||
                    ''
                ).toLowerCase()
                if (
                    projectPrompt.includes('imported from') ||
                    projectPrompt.startsWith('importing github repository')
                ) {
                    resolvedType = 'github'
                } else if (
                    projectPrompt.startsWith('uploading zip archive') ||
                    projectPrompt.includes('project.zip')
                ) {
                    resolvedType = 'zip'
                }
            }

            setProjectType(resolvedType)

            setCanvasState(detail.canvasState ?? createEmptyCanvasDocument())
            lastSavedCanvasRef.current = JSON.stringify(
                detail.canvasState ?? createEmptyCanvasDocument()
            )
            replaceGeneratedOutput(detail.generatedFiles || {})
            setGenerationPhase(null)
            setActiveOperation(null)
            lastAutoFixSignatureRef.current = null
            navigate(`/sessions/${toProjectSlug(projectName)}`, { replace: true })
        },
        [
            navigate,
            replaceGeneratedOutput,
            setActiveProjectId,
            setActiveProjectName,
            setProjectVersions,
            setActiveProjectVersionId,
            setProjectLoadError,
            setMessages,
            setProjectType,
            setCanvasState,
            setGenerationPhase,
            setActiveOperation,
        ]
    )

    const openProject = React.useCallback(
        async ({
            projectId,
            versionId,
            originView,
            abortActiveGeneration = true,
        }: {
            projectId: string
            versionId?: string | null
            originView?: ViewState
            abortActiveGeneration?: boolean
        }) => {
            if (abortActiveGeneration) {
                abortGenerationRequest()
                setIsGenerating(false)
                resetGenerationRefs()
            }

            if (originView) {
                outputOriginViewRef.current = originView
            }

            setIsMobileSidebarOpen(false)
            setIsProjectOpening(true)
            setProjectLoadError(null)

            try {
                const detail = await projectAPI.getProject(projectId, versionId)
                hydrateProjectDetail(detail)
                // Buffer (1000ms) to allow Workspace DOM, preview iframe, and terminal to fully warm up in background
                await new Promise((resolve) => setTimeout(resolve, 1000))
            } catch (error) {
                setProjectLoadError(
                    error instanceof Error ? error.message : 'Failed to open project'
                )
            } finally {
                setIsProjectOpening(false)
            }
        },
        [
            abortGenerationRequest,
            hydrateProjectDetail,
            resetGenerationRefs,
            setIsGenerating,
            outputOriginViewRef,
            setIsMobileSidebarOpen,
            setIsProjectOpening,
            setProjectLoadError,
        ]
    )

    const pollImportUntilComplete = React.useCallback(
        async (
            importId: string,
            onStatus?: (status: ProjectImportStatus) => Promise<void> | void
        ) => {
            const startedAt = Date.now()
            const timeoutMs = 3 * 60 * 1000

            while (Date.now() - startedAt < timeoutMs) {
                const status = await importsAPI.getImportStatus(importId)

                setImportState({
                    status: status.status === 'FAILED' ? 'failed' : 'loading',
                    message: getImportStatusMessage(status),
                })

                await onStatus?.(status)

                if (status.status === 'READY') {
                    return status
                }

                if (status.status === 'FAILED') {
                    throw new Error(status.errorMessage || 'Import failed')
                }

                await new Promise((resolve) => window.setTimeout(resolve, 1500))
            }

            throw new Error('Import timed out while preparing the preview')
        },
        [setImportState]
    )

    const handleImportGithub = React.useCallback(
        async (repoUrl: string) => {
            await requireAuthOr(async () => {
                setMessages([])
                resetGeneratedOutput()
                setGenerationPhase(null)
                setActiveOperation('build')
                setIsGenerating(true)
                setProjectType('github')
                setProjectLoadError(null)
                setImportState({ status: 'loading', message: 'Validating GitHub repository' })
                let hasLoadedFinalFiles = false

                try {
                    const queuedImport = await importsAPI.importGithub(repoUrl)

                    if (queuedImport.projectId) {
                        sessionStorage.setItem(
                            `december_actively_importing_${queuedImport.projectId}`,
                            'true'
                        )
                        void queryClient.invalidateQueries({ queryKey: ['projects'] })
                        await openProject({
                            projectId: queuedImport.projectId,
                            versionId: queuedImport.projectVersionId,
                            originView: view,
                            abortActiveGeneration: false,
                        })
                    }

                    const completedImport = await pollImportUntilComplete(
                        queuedImport.id,
                        async (status) => {
                            if (!status.projectId) {
                                return
                            }

                            if (
                                !hasLoadedFinalFiles &&
                                (status.status === 'STARTING_RUNTIME' || status.status === 'READY')
                            ) {
                                hasLoadedFinalFiles = true
                                void queryClient.invalidateQueries({ queryKey: ['projects'] })
                                await openProject({
                                    projectId: status.projectId,
                                    versionId: status.projectVersionId,
                                    originView: view,
                                    abortActiveGeneration: false,
                                })
                            }
                        }
                    )

                    if (!completedImport.projectId) {
                        throw new Error('Import completed without a project')
                    }

                    setImportState({ status: 'ready', message: 'Opening imported project' })
                    void queryClient.invalidateQueries({ queryKey: ['projects'] })
                    await openProject({
                        projectId: completedImport.projectId,
                        versionId: completedImport.projectVersionId,
                        originView: view,
                        abortActiveGeneration: false,
                    })
                } catch (error) {
                    setImportState({
                        status: 'failed',
                        message: error instanceof Error ? error.message : 'Import failed',
                    })
                } finally {
                    resetGenerationRefs()
                    setIsGenerating(false)
                }
            })
        },
        [
            openProject,
            pollImportUntilComplete,
            queryClient,
            requireAuthOr,
            resetGenerationRefs,
            view,
            setMessages,
            resetGeneratedOutput,
            setGenerationPhase,
            setActiveOperation,
            setIsGenerating,
            setProjectType,
            setProjectLoadError,
            setImportState,
        ]
    )

    const handleImportZip = React.useCallback(
        async (file: File) => {
            await requireAuthOr(async () => {
                setMessages([])
                resetGeneratedOutput()
                setGenerationPhase(null)
                setActiveOperation('build')
                setIsGenerating(true)
                setProjectType('zip')
                setProjectLoadError(null)
                setImportState({ status: 'loading', message: 'Uploading zip archive' })
                let hasLoadedFinalFiles = false

                try {
                    const queuedImport = await importsAPI.importZip(file)

                    if (queuedImport.projectId) {
                        sessionStorage.setItem(
                            `december_actively_importing_${queuedImport.projectId}`,
                            'true'
                        )
                        void queryClient.invalidateQueries({ queryKey: ['projects'] })
                        await openProject({
                            projectId: queuedImport.projectId,
                            versionId: queuedImport.projectVersionId,
                            originView: view,
                            abortActiveGeneration: false,
                        })
                    }

                    const completedImport = await pollImportUntilComplete(
                        queuedImport.id,
                        async (status) => {
                            if (!status.projectId) {
                                return
                            }

                            if (
                                !hasLoadedFinalFiles &&
                                (status.status === 'STARTING_RUNTIME' || status.status === 'READY')
                            ) {
                                hasLoadedFinalFiles = true
                                void queryClient.invalidateQueries({ queryKey: ['projects'] })
                                await openProject({
                                    projectId: status.projectId,
                                    versionId: status.projectVersionId,
                                    originView: view,
                                    abortActiveGeneration: false,
                                })
                            }
                        }
                    )

                    if (!completedImport.projectId) {
                        throw new Error('Import completed without a project')
                    }

                    setImportState({ status: 'ready', message: 'Opening imported project' })
                    void queryClient.invalidateQueries({ queryKey: ['projects'] })
                    await openProject({
                        projectId: completedImport.projectId,
                        versionId: completedImport.projectVersionId,
                        originView: view,
                        abortActiveGeneration: false,
                    })
                } catch (error) {
                    setImportState({
                        status: 'failed',
                        message: error instanceof Error ? error.message : 'Import failed',
                    })
                } finally {
                    resetGenerationRefs()
                    setIsGenerating(false)
                }
            })
        },
        [
            openProject,
            pollImportUntilComplete,
            queryClient,
            requireAuthOr,
            resetGenerationRefs,
            view,
            setMessages,
            resetGeneratedOutput,
            setGenerationPhase,
            setActiveOperation,
            setIsGenerating,
            setProjectType,
            setProjectLoadError,
            setImportState,
        ]
    )

    const handleOpenProject = React.useCallback(
        (projectId: string, versionId?: string | null) => {
            requireAuthOr(() => {
                void openProject({
                    projectId,
                    versionId,
                    originView: view,
                })
            })
        },
        [openProject, view, requireAuthOr]
    )

    const handleSelectVersion = React.useCallback(
        (versionId: string) => {
            if (
                !activeProjectId ||
                !versionId ||
                versionId === activeProjectVersionId ||
                isGenerating
            ) {
                return
            }

            void openProject({
                projectId: activeProjectId,
                versionId,
                originView: outputOriginViewRef.current,
            })
        },
        [activeProjectId, activeProjectVersionId, isGenerating, openProject, outputOriginViewRef]
    )

    return {
        openProject,
        handleOpenProject,
        handleSelectVersion,
        handleImportGithub,
        handleImportZip,
        lastSavedCanvasRef,
        lastAutoFixSignatureRef,
    }
}
