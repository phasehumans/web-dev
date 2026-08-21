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
import { projectAPI } from '@/features/sessions/api/project'
import { useSessionController } from '@/features/sessions/hooks/useSessionController'
import { refreshAuthSession } from '@/shared/api/client'

export const useAppController = () => {
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()

    const view = getViewForPath(location.pathname)

    const {
        messages,
        generatedFiles,
        activeGeneratedFilePath,
        setActiveGeneratedFilePath,
        generationPhase,
        activeOperation,
        currentGenerationFilePaths,
        projectType,
        isGenerating,
        isAuthenticated,
        setIsAuthenticated,
        showAuthModal,
        setShowAuthModal,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        activeProjectId,
        activeProjectName,
        canvasState,
        setCanvasState,
        projectVersions,
        activeProjectVersionId,
        isProjectOpening,
        projectLoadError,
        setProjectLoadError,
        previewSession,
        setPreviewSession,
        previewSessionError,
        setPreviewSessionError,
        importState,
    } = useAppStore()

    const generationAbortControllerRef = React.useRef<AbortController | null>(null)
    const activeAssistantMessageIdRef = React.useRef<string | null>(null)
    const outputOriginViewRef = React.useRef<ViewState>('chat')

    React.useEffect(() => {
        let isMounted = true

        const restoreSession = async () => {
            const refreshed = await refreshAuthSession()
            if (!isMounted || !refreshed) return

            setIsAuthenticated(true)
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        }

        void restoreSession()
        return () => {
            isMounted = false
        }
    }, [queryClient, setIsAuthenticated])

    React.useEffect(() => {
        if (isAuthenticated && view === 'landing') {
            navigate('/', { replace: true })
        }
    }, [isAuthenticated, view, navigate])

    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: profileAPI.getProfile,
        enabled: isAuthenticated,
    })

    const isHome = view === 'chat' && !activeProjectId && messages.length === 0
    const showSidebar = view !== 'profile' && view !== 'docs' && view !== 'canvas'
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
            const result = await projectAPI.downloadProject(activeProjectId)
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
                const projectsData = queryClient.getQueryData<any>(['projects'])
                const projects = Array.isArray(projectsData)
                    ? projectsData
                    : Array.isArray(projectsData?.projects)
                      ? projectsData.projects
                      : Array.isArray(projectsData?.data)
                        ? projectsData.data
                        : []
                const sessionsData = queryClient.getQueryData<any>(['sessions'])
                const sessions = Array.isArray(sessionsData)
                    ? sessionsData
                    : Array.isArray(sessionsData?.sessions)
                      ? sessionsData.sessions
                      : Array.isArray(sessionsData?.data)
                        ? sessionsData.data
                        : []

                const matchingItem =
                    projects.find(
                        (p: any) => p && (p.id === slug || toProjectSlug(p.name || '') === slug)
                    ) ||
                    sessions.find(
                        (s: any) => s && (s.id === slug || toProjectSlug(s.title || '') === slug)
                    )
                if (matchingItem) {
                    void openProject({
                        projectId: matchingItem.id,
                        originView: 'all-projects',
                    })
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

    const activeFilesToDisplay = React.useMemo(() => {
        if (currentGenerationFilePaths.length === 0) return generatedFiles
        const filtered: Record<string, any> = {}
        for (const path of currentGenerationFilePaths) {
            if (generatedFiles[path]) filtered[path] = generatedFiles[path]
        }
        return filtered
    }, [generatedFiles, currentGenerationFilePaths])

    return {
        queryClient,
        view,
        messages,
        generatedFiles,
        activeFilesToDisplay,
        activeGeneratedFilePath,
        generationPhase,
        activeOperation,
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
        projectVersions,
        activeProjectVersionId,
        isProjectOpening,
        projectLoadError,
        previewSession,
        previewSessionError,
        importState,
        projectType,
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
