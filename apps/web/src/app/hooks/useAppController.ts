import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store'
import { getViewForPath, toProjectSlug, type ViewState } from '@/app/types'
import { canvasAPI } from '@/features/canvas/api'
import { createEmptyCanvasDocument } from '@/features/canvas/types'
import { useChatController } from '@/features/chat/hooks/useChatController'
import { useNavigationController } from '@/features/navigation/hooks/useNavigationController'
import { previewAPI } from '@/features/preview/api'
import { profileAPI } from '@/features/profile/api/profile'
import { sessionAPI } from '@/features/sessions/api/session'
import { useSessionController } from '@/features/sessions/hooks/useSessionController'
import { refreshAuthSession } from '@/shared/api/client'

export const useAppController = () => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()

    const view = getViewForPath(location.pathname)

    const hasMessages = useAppStore((s) => s.messages.length > 0)
    const activeProjectId = useAppStore((s) => s.activeProjectId)
    const activeProjectName = useAppStore((s) => s.activeProjectName)
    const activeProjectVersionId = useAppStore((s) => s.activeProjectVersionId)
    const isGenerating = useAppStore((s) => s.isGenerating)
    const isAuthenticated = useAppStore((s) => s.isAuthenticated)
    const setIsAuthenticated = useAppStore((s) => s.setIsAuthenticated)
    const showAuthModal = useAppStore((s) => s.showAuthModal)
    const setShowAuthModal = useAppStore((s) => s.setShowAuthModal)
    const isMobileSidebarOpen = useAppStore((s) => s.isMobileSidebarOpen)
    const setIsMobileSidebarOpen = useAppStore((s) => s.setIsMobileSidebarOpen)
    const canvasState = useAppStore((s) => s.canvasState)
    const setCanvasState = useAppStore((s) => s.setCanvasState)
    const isProjectOpening = useAppStore((s) => s.isProjectOpening)
    const projectLoadError = useAppStore((s) => s.projectLoadError)
    const setProjectLoadError = useAppStore((s) => s.setProjectLoadError)
    const previewSession = useAppStore((s) => s.previewSession)
    const setPreviewSession = useAppStore((s) => s.setPreviewSession)
    const previewSessionError = useAppStore((s) => s.previewSessionError)
    const setPreviewSessionError = useAppStore((s) => s.setPreviewSessionError)
    const importState = useAppStore((s) => s.importState)
    const setActiveGeneratedFilePath = useAppStore((s) => s.setActiveGeneratedFilePath)

    const generationAbortControllerRef = React.useRef<AbortController | null>(null)
    const activeAssistantMessageIdRef = React.useRef<string | null>(null)
    const outputOriginViewRef = React.useRef<ViewState>('chat')

    React.useEffect(() => {
        let isMounted = true

        const restoreSession = async () => {
            try {
                await profileAPI.getQuickInfo()
                if (!isMounted) return

                setIsAuthenticated(true)
                queryClient.invalidateQueries({ queryKey: ['sessions'] })
                queryClient.invalidateQueries({ queryKey: ['profile'] })
            } catch {
                // Intentionally swallowed: unauthenticated visitor on initial session restore
            }
        }

        void restoreSession()
        return () => {
            isMounted = false
        }
    }, [queryClient, setIsAuthenticated])

    // Periodic proactive token refresh (every 10 mins) to prevent session timeouts while tab is open
    React.useEffect(() => {
        if (!isAuthenticated) return

        const refreshInterval = setInterval(
            () => {
                void refreshAuthSession()
            },
            10 * 60 * 1000
        )

        return () => clearInterval(refreshInterval)
    }, [isAuthenticated])

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: isAuthenticated,
    })

    const isHome = view === 'chat' && !activeProjectId && !hasMessages
    const showSidebar = view !== 'profile' && view !== 'canvas'
    const { handleNewThread, handleHomeClick, handleNavigate, handleSignOut } =
        useNavigationController()

    const {
        openProject,
        handleOpenProject,
        handleSelectVersion,
        handleImportGithub,
        handleImportZip,
        lastSavedCanvasRef,
        lastAutoFixSignatureRef,
    } = useSessionController(
        view,
        () => {
            generationAbortControllerRef.current?.abort()
            generationAbortControllerRef.current = null
        },
        () => {
            activeAssistantMessageIdRef.current = null
            useAppStore.getState().setGenerationPhase(null)
            useAppStore.getState().setActiveOperation(null)
            useAppStore.getState().setCurrentGenerationFilePaths([])
        },
        outputOriginViewRef
    )

    const {
        handlePromptSubmit,
        handleOutputPromptSubmit,
        handlePreviewRuntimeError,
        resetGenerationRefs,
    } = useChatController(
        view,
        openProject,
        generationAbortControllerRef,
        activeAssistantMessageIdRef,
        outputOriginViewRef,
        lastAutoFixSignatureRef
    )

    const handleResetImportState = React.useCallback(() => {
        useAppStore.getState().setImportState({ status: 'idle', message: null })
    }, [])

    const handleBackFromOutput = React.useCallback(() => {
        resetGenerationRefs()
        if (activeProjectId) {
            void previewAPI.stopPreview(activeProjectId).catch((err) => {
                console.error('Failed to stop preview on exit:', err)
            })
        }
        useAppStore.getState().setActiveProjectId(null)
        useAppStore.getState().setActiveProjectName(null)
        useAppStore.getState().setActiveProjectVersionId(null)
        useAppStore.getState().setProjectVersions([])
        useAppStore.getState().setMessages([])
        useAppStore.getState().setCanvasState(createEmptyCanvasDocument())
        useAppStore.getState().setGeneratedFiles({})
        useAppStore.getState().setImportState({ status: 'idle', message: null })
        useAppStore.getState().setPreviewSession(null)
        useAppStore.getState().setProjectLoadError(null)

        navigate('/sessions')
    }, [activeProjectId, navigate, resetGenerationRefs])

    const handleDownloadProject = React.useCallback(async () => {
        if (!activeProjectId) return

        try {
            const result = await sessionAPI.downloadSession(activeProjectId)
            const url = window.URL.createObjectURL(result.blob)
            const anchor = document.createElement('a')
            anchor.href = url
            const username = (profile?.username || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '')
            const projectName = (activeProjectName || 'project')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9_-]/g, '')
            anchor.download = `december-${username}-${projectName}.zip`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            setProjectLoadError(
                error instanceof Error ? error.message : 'Failed to download project'
            )
        }
    }, [activeProjectId, profile?.username, activeProjectName, setProjectLoadError])

    // deep-link resolution
    React.useEffect(() => {
        if (!isAuthenticated || activeProjectId || isProjectOpening) return

        if (
            location.pathname.startsWith('/sessions/') ||
            location.pathname.startsWith('/session/') ||
            location.pathname.startsWith('/project/')
        ) {
            const parts = location.pathname.split('/')
            const slug = parts[parts.length - 1]
            if (slug && slug !== 'untitled') {
                let isMounted = true

                const resolveSession = async () => {
                    // 1. Try finding in any cached queries
                    const matchingQueries = queryClient.getQueriesData<any>({
                        queryKey: ['sessions'],
                    })
                    for (const [, sessionsData] of matchingQueries) {
                        const sessions = Array.isArray(sessionsData)
                            ? sessionsData
                            : Array.isArray(sessionsData?.sessions)
                              ? sessionsData.sessions
                              : Array.isArray(sessionsData?.data)
                                ? sessionsData.data
                                : Array.isArray(sessionsData?.pages)
                                  ? sessionsData.pages.flatMap((p: any) => p?.sessions || [])
                                  : []

                        const matchingItem = sessions.find(
                            (s: any) =>
                                s &&
                                (s.id === slug ||
                                    toProjectSlug(s.title || s.projectName || '') === slug)
                        )
                        if (matchingItem && isMounted) {
                            void openProject({
                                projectId: matchingItem.id,
                                originView: 'all-projects',
                            })
                            return
                        }
                    }

                    // 2. Direct API resolution fallback (either direct ID or slug match via getSessions)
                    try {
                        try {
                            const detail = await sessionAPI.getSessionDetail(slug)
                            const sessionOrProject = (detail as any).session || detail.project
                            if (sessionOrProject?.id && isMounted) {
                                void openProject({
                                    projectId: sessionOrProject.id,
                                    originView: 'all-projects',
                                })
                                return
                            }
                        } catch {
                            // Intentionally swallowed: slug may not be an ID, try lookup in getSessions list below
                        }

                        const sessionsRes = await sessionAPI.getSessions()
                        if (!isMounted) return
                        const sessionList = Array.isArray(sessionsRes)
                            ? sessionsRes
                            : Array.isArray(sessionsRes?.sessions)
                              ? sessionsRes.sessions
                              : []

                        const found = sessionList.find(
                            (s: any) =>
                                s &&
                                (s.id === slug ||
                                    toProjectSlug(s.title || s.projectName || '') === slug)
                        )
                        if (found && isMounted) {
                            void openProject({
                                projectId: found.id,
                                originView: 'all-projects',
                            })
                        }
                    } catch (err) {
                        console.error('[deep-link] failed to resolve session:', err)
                    }
                }

                void resolveSession()
                return () => {
                    isMounted = false
                }
            }
        }
    }, [
        isAuthenticated,
        activeProjectId,
        isProjectOpening,
        location.pathname,
        openProject,
        queryClient,
    ])

    // auto-save canvas state
    React.useEffect(() => {
        if (!isAuthenticated || !activeProjectId) return
        const serialized = JSON.stringify(canvasState)
        if (serialized === lastSavedCanvasRef.current) return
        if (canvasState.items.length === 0 && !canvasState.hasInteracted) return

        const timer = setTimeout(async () => {
            try {
                lastSavedCanvasRef.current = serialized
                await canvasAPI.saveCanvas({
                    projectId: activeProjectId,
                    versionId: activeProjectVersionId,
                    canvasState,
                })
            } catch (err) {
                console.error('[canvas] failed to auto-save:', err)
            }
        }, 1500)
        return () => clearTimeout(timer)
    }, [canvasState, activeProjectId, activeProjectVersionId, isAuthenticated, lastSavedCanvasRef])

    // poll preview session
    React.useEffect(() => {
        if (!isAuthenticated || !activeProjectId || !activeProjectVersionId) {
            setPreviewSession(null)
            setPreviewSessionError(null)
            return
        }

        let isCancelled = false
        let timeoutHandle: number | null = null

        const schedulePoll = (delay: number) => {
            timeoutHandle = window.setTimeout(() => {
                void pollStatus()
            }, delay)
        }

        const pollStatus = async () => {
            try {
                const nextStatus = await previewAPI.getPreviewStatus(activeProjectId)
                if (isCancelled) return
                setPreviewSession(nextStatus)
                setPreviewSessionError(null)
                schedulePoll(nextStatus.backendStatus === 'ready' && !isGenerating ? 4000 : 1500)
            } catch (error) {
                if (isCancelled) return
                setPreviewSessionError(
                    error instanceof Error ? error.message : 'Failed to refresh preview'
                )
                schedulePoll(3000)
            }
        }

        void (async () => {
            try {
                const nextStatus = await previewAPI.startPreview(
                    activeProjectId,
                    activeProjectVersionId
                )
                if (isCancelled) return
                setPreviewSession(nextStatus)
                setPreviewSessionError(null)
            } catch (error) {
                if (isCancelled) return
                setPreviewSessionError(
                    error instanceof Error ? error.message : 'Failed to start preview'
                )
            } finally {
                schedulePoll(1500)
            }
        })()

        return () => {
            isCancelled = true
            if (timeoutHandle) clearTimeout(timeoutHandle)
        }
    }, [
        activeProjectId,
        activeProjectVersionId,
        isAuthenticated,
        isGenerating,
        setPreviewSession,
        setPreviewSessionError,
    ])

    return {
        queryClient,
        view,
        isGenerating,
        setIsAuthenticated,
        showAuthModal,
        setShowAuthModal,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isAuthenticated,
        isHome,
        showSidebar,
        activeProjectId,
        activeProjectName,
        canvasState,
        setCanvasState,
        activeProjectVersionId,
        isProjectOpening,
        projectLoadError,
        previewSession,
        previewSessionError,
        importState,
        handleNewThread,
        handleHomeClick,
        handleNavigate,
        handleSignOut,
        handlePromptSubmit,
        handleOutputPromptSubmit,
        handlePreviewRuntimeError,
        handleImportGithub,
        handleImportZip,
        handleBackFromOutput,
        handleOpenProject,
        handleSelectVersion,
        handleDownloadProject,
        handleOpenFile: setActiveGeneratedFilePath,
        resetImportState: handleResetImportState,
    }
}
