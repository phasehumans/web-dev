import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import type { ViewState } from '@/app/types'
import type { CanvasDocument } from '@/features/canvas/types'
import type { Message } from '@/features/chat/types'
import type { PreviewRuntimeError, PreviewSelectedElement } from '@/features/preview/types'

import { useAppStore } from '@/app/store'
import { mapBackendMessageToUIMessage } from '@/features/chat/utils'
import {
    generationAPI,
    type AppliedProjectChangeResult,
    type GenerationStreamEvent,
} from '@/features/generation/api/generation'

export const useChatController = (
    view: ViewState,
    openProject: (args: {
        projectId: string
        versionId?: string | null
        originView?: ViewState
        abortActiveGeneration?: boolean
    }) => Promise<void>,
    generationAbortControllerRef: React.MutableRefObject<AbortController | null>,
    activeAssistantMessageIdRef: React.MutableRefObject<string | null>,
    outputOriginViewRef: React.MutableRefObject<ViewState>,
    lastAutoFixSignatureRef: React.MutableRefObject<string | null>
) => {
    const queryClient = useQueryClient()
    const {
        activeProjectId,
        activeProjectVersionId,
        setActiveProjectId,
        setActiveProjectName,
        setActiveProjectVersionId,
        setProjectVersions,
        setProjectLoadError,
        setMessages,
        setGenerationPhase,
        setActiveOperation,
        setIsGenerating,
        setProjectType,
        setCurrentGenerationFilePaths,
        appendAssistantChunk,
        setAssistantStatus,
        setAssistantError,
        setAssistantAppliedFiles,
        startGeneratedFile,
        appendGeneratedFileChunk,
        completeGeneratedFile,
        markGeneratedFileError,
        replaceGeneratedOutput,
        resetGeneratedOutput,
        canvasState,
        isAuthenticated,
        setShowAuthModal,
    } = useAppStore()

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

    const resetGenerationRefs = React.useCallback(() => {
        activeAssistantMessageIdRef.current = null
        setGenerationPhase(null)
        setActiveOperation(null)
        setCurrentGenerationFilePaths([])
    }, [
        activeAssistantMessageIdRef,
        setGenerationPhase,
        setActiveOperation,
        setCurrentGenerationFilePaths,
    ])

    const abortGenerationRequest = React.useCallback(() => {
        generationAbortControllerRef.current?.abort()
        generationAbortControllerRef.current = null
    }, [generationAbortControllerRef])

    const hydrateAppliedProjectChange = React.useCallback(
        (result: AppliedProjectChangeResult) => {
            const preferredPath = result.appliedFiles[result.appliedFiles.length - 1] ?? null

            setActiveProjectId(result.project.id)
            setActiveProjectName(result.project.name)
            setProjectVersions(result.versions)
            setActiveProjectVersionId(result.version.id)
            setProjectLoadError(null)

            const uiMessages = result.chatMessages.map(mapBackendMessageToUIMessage)
            const activeVersionSummary = result.versions.find(
                (v) => v.id === result.version.id
            )?.summary
            if (activeVersionSummary) {
                const lastAssistantIdx = [...uiMessages]
                    .reverse()
                    .findIndex((m) => m.role === 'assistant')
                if (lastAssistantIdx !== -1) {
                    const idx = uiMessages.length - 1 - lastAssistantIdx
                    uiMessages[idx].summary = activeVersionSummary
                }
            }
            setMessages(uiMessages)

            replaceGeneratedOutput(result.generatedFiles, preferredPath)
            setGenerationPhase('done')
        },
        [
            replaceGeneratedOutput,
            setActiveProjectId,
            setActiveProjectName,
            setProjectVersions,
            setActiveProjectVersionId,
            setProjectLoadError,
            setMessages,
            setGenerationPhase,
        ]
    )

    const startGeneration = React.useCallback(
        (
            prompt: string,
            assistantMessageId: string,
            projectId?: string | null,
            nextCanvasState?: CanvasDocument
        ) => {
            abortGenerationRequest()
            resetGeneratedOutput()
            activeAssistantMessageIdRef.current = assistantMessageId
            setGenerationPhase('thinking')
            setActiveOperation('build')
            setCurrentGenerationFilePaths([])
            setIsGenerating(true)
            setProjectType('generated')
            setProjectLoadError(null)

            const abortController = new AbortController()
            generationAbortControllerRef.current = abortController

            void (async () => {
                try {
                    await generationAPI.generateProjectStream({
                        prompt,
                        projectId,
                        canvasState: nextCanvasState,
                        signal: abortController.signal,
                        onEvent: (event) => {
                            const activeMessageId = activeAssistantMessageIdRef.current

                            if (!activeMessageId) {
                                return
                            }

                            switch (event.type) {
                                case 'connected':
                                    return
                                case 'project-created':
                                    setActiveProjectId(event.data.project.id)
                                    setActiveProjectName(event.data.project.name)
                                    setActiveProjectVersionId(event.data.version.id)
                                    void queryClient.invalidateQueries({ queryKey: ['projects'] })
                                    return
                                case 'phase':
                                    if (event.data.phase === 'building') {
                                        setGenerationPhase('building')
                                        setAssistantStatus(activeMessageId, 'building')
                                    }
                                    return
                                case 'message-start':
                                    if (event.data.status === 'thinking') {
                                        setGenerationPhase('thinking')
                                        setAssistantStatus(activeMessageId, 'thinking')
                                    }
                                    return
                                case 'message-chunk':
                                    appendAssistantChunk(
                                        activeMessageId,
                                        event.data.chunk,
                                        event.data.messageId
                                    )
                                    return
                                case 'message-complete':
                                case 'build-plan':
                                case 'patch-plan':
                                    return
                                case 'file-start':
                                    setCurrentGenerationFilePaths(
                                        useAppStore
                                            .getState()
                                            .currentGenerationFilePaths.includes(event.data.path)
                                            ? useAppStore.getState().currentGenerationFilePaths
                                            : [
                                                  ...useAppStore.getState()
                                                      .currentGenerationFilePaths,
                                                  event.data.path,
                                              ]
                                    )
                                    startGeneratedFile(event.data)
                                    return
                                case 'file-chunk':
                                    appendGeneratedFileChunk(event.data.path, event.data.chunk)
                                    return
                                case 'file-complete':
                                    completeGeneratedFile(event.data.path)
                                    return
                                case 'file-error':
                                    markGeneratedFileError(event.data.path)
                                    return
                                case 'result':
                                    setGenerationPhase('done')
                                    setAssistantStatus(activeMessageId, 'done')
                                    replaceGeneratedOutput(event.data.generatedFiles)
                                    setActiveProjectId(event.data.project.id)
                                    setActiveProjectName(event.data.project.name)
                                    setActiveProjectVersionId(event.data.version.id)
                                    void queryClient.invalidateQueries({ queryKey: ['projects'] })
                                    void openProject({
                                        projectId: event.data.project.id,
                                        versionId: event.data.version.id,
                                        originView: outputOriginViewRef.current,
                                        abortActiveGeneration: false,
                                    })
                                    return
                                case 'error': {
                                    const activeFile =
                                        useAppStore.getState().activeGeneratedFilePath
                                    if (activeFile) {
                                        markGeneratedFileError(activeFile)
                                    }
                                    return
                                }
                            }
                        },
                    })
                } catch (error) {
                    if (abortController.signal.aborted) {
                        return
                    }

                    const activeMessageId = activeAssistantMessageIdRef.current
                    const message =
                        error instanceof Error ? error.message : 'Generation failed unexpectedly.'

                    const activeFile = useAppStore.getState().activeGeneratedFilePath
                    if (activeFile) {
                        markGeneratedFileError(activeFile)
                    }

                    if (activeMessageId) {
                        setAssistantError(activeMessageId, message)
                    }
                } finally {
                    if (generationAbortControllerRef.current === abortController) {
                        generationAbortControllerRef.current = null
                        resetGenerationRefs()
                        setIsGenerating(false)
                    }
                }
            })()
        },
        [
            abortGenerationRequest,
            activeAssistantMessageIdRef,
            appendAssistantChunk,
            appendGeneratedFileChunk,
            completeGeneratedFile,
            generationAbortControllerRef,
            markGeneratedFileError,
            openProject,
            outputOriginViewRef,
            queryClient,
            replaceGeneratedOutput,
            resetGeneratedOutput,
            resetGenerationRefs,
            setActiveOperation,
            setActiveProjectId,
            setActiveProjectName,
            setActiveProjectVersionId,
            setAssistantError,
            setAssistantStatus,
            setCurrentGenerationFilePaths,
            setGenerationPhase,
            setIsGenerating,
            setProjectLoadError,
            setProjectType,
            startGeneratedFile,
        ]
    )

    const handlePromptSubmit = React.useCallback(
        (prompt: string) => {
            requireAuthOr(() => {
                const normalizedPrompt = prompt.trim()
                if (!normalizedPrompt) {
                    return
                }

                outputOriginViewRef.current = view
                setProjectLoadError(null)

                const baseId = Date.now().toString()
                const assistantMessageId = `${baseId}-assistant`
                const userMsg: Message = {
                    id: baseId,
                    role: 'user',
                    content: normalizedPrompt,
                }
                const assistantMsg: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    type: 'text',
                    status: 'thinking',
                }

                setMessages([userMsg, assistantMsg])
                startGeneration(normalizedPrompt, assistantMessageId, activeProjectId, canvasState)
            })
        },
        [
            activeProjectId,
            canvasState,
            startGeneration,
            view,
            requireAuthOr,
            outputOriginViewRef,
            setProjectLoadError,
            setMessages,
        ]
    )

    const applyProjectChange = React.useCallback(
        ({
            kind,
            prompt,
            selectedElement,
            errorMessage,
            stack,
            visibleUserMessage,
            canvasState,
        }: {
            kind: 'edit' | 'fix'
            prompt?: string
            selectedElement?: PreviewSelectedElement
            errorMessage?: string
            stack?: string | null
            visibleUserMessage: string
            canvasState?: CanvasDocument
        }) => {
            if (!activeProjectId) {
                return
            }

            abortGenerationRequest()
            setProjectLoadError(null)

            const baseId = Date.now().toString()
            const assistantMessageId = `${baseId}-assistant`
            const userMsg: Message = {
                id: baseId,
                role: 'user',
                content: visibleUserMessage,
            }
            const assistantMsg: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                type: 'text',
                status: 'thinking',
            }

            setMessages((prev) => [...prev, userMsg, assistantMsg])
            activeAssistantMessageIdRef.current = assistantMessageId
            setGenerationPhase('thinking')
            setActiveOperation(kind)
            setCurrentGenerationFilePaths([])
            setIsGenerating(true)
            setProjectType('generated')

            const abortController = new AbortController()
            generationAbortControllerRef.current = abortController

            void (async () => {
                try {
                    let didHydrateStreamResult = false
                    const handleStreamEvent = (event: GenerationStreamEvent) => {
                        const activeMessageId = activeAssistantMessageIdRef.current

                        if (!activeMessageId) {
                            return
                        }

                        switch (event.type) {
                            case 'connected':
                                return
                            case 'phase':
                                if (event.data.phase === 'thinking') {
                                    setGenerationPhase('thinking')
                                    setAssistantStatus(activeMessageId, 'thinking')
                                }

                                if (event.data.phase === 'building') {
                                    setGenerationPhase('building')
                                    setAssistantStatus(activeMessageId, 'building')
                                }
                                return
                            case 'message-start':
                                if (event.data.status === 'thinking') {
                                    setGenerationPhase('thinking')
                                    setAssistantStatus(activeMessageId, 'thinking')
                                }
                                return
                            case 'message-chunk':
                                appendAssistantChunk(
                                    activeMessageId,
                                    event.data.chunk,
                                    event.data.messageId
                                )
                                return
                            case 'message-complete':
                                return
                            case 'patch-plan':
                            case 'build-plan':
                                setAssistantAppliedFiles(
                                    activeMessageId,
                                    event.data.files.map((f) => f.path)
                                )
                                return
                            case 'file-start':
                                setCurrentGenerationFilePaths(
                                    useAppStore
                                        .getState()
                                        .currentGenerationFilePaths.includes(event.data.path)
                                        ? useAppStore.getState().currentGenerationFilePaths
                                        : [
                                              ...useAppStore.getState().currentGenerationFilePaths,
                                              event.data.path,
                                          ]
                                )
                                startGeneratedFile(event.data)
                                return
                            case 'file-chunk':
                                appendGeneratedFileChunk(event.data.path, event.data.chunk)
                                return
                            case 'file-complete':
                                completeGeneratedFile(event.data.path)
                                return
                            case 'file-error':
                                markGeneratedFileError(event.data.path)
                                return
                            case 'result':
                                if (
                                    event.data.versions &&
                                    event.data.chatMessages &&
                                    event.data.appliedFiles &&
                                    event.data.deletedFiles &&
                                    event.data.assistantMessage
                                ) {
                                    didHydrateStreamResult = true
                                    hydrateAppliedProjectChange({
                                        project: event.data.project,
                                        version: event.data.version,
                                        versions: event.data.versions,
                                        chatMessages: event.data.chatMessages,
                                        generatedFiles: event.data.generatedFiles,
                                        appliedFiles: event.data.appliedFiles,
                                        deletedFiles: event.data.deletedFiles,
                                        assistantMessage: event.data.assistantMessage,
                                    })
                                    void queryClient.invalidateQueries({ queryKey: ['projects'] })
                                }
                                return
                            case 'project-created':
                            case 'error':
                                return
                        }
                    }

                    const result =
                        kind === 'edit'
                            ? await generationAPI.applyProjectEdit({
                                  projectId: activeProjectId,
                                  versionId: activeProjectVersionId,
                                  prompt: prompt ?? '',
                                  ...(selectedElement ? { selectedElement } : {}),
                                  ...(canvasState ? { canvasState } : {}),
                                  signal: abortController.signal,
                                  onEvent: handleStreamEvent,
                              })
                            : await generationAPI.applyProjectFix({
                                  projectId: activeProjectId,
                                  versionId: activeProjectVersionId,
                                  errorMessage: errorMessage ?? '',
                                  ...(stack ? { stack } : {}),
                                  signal: abortController.signal,
                                  onEvent: handleStreamEvent,
                              })

                    if (abortController.signal.aborted) {
                        return
                    }

                    if (result && !didHydrateStreamResult) {
                        hydrateAppliedProjectChange(result)
                        void queryClient.invalidateQueries({ queryKey: ['projects'] })
                    }
                } catch (error) {
                    if (abortController.signal.aborted) {
                        return
                    }

                    const activeMessageId = activeAssistantMessageIdRef.current
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Project update failed unexpectedly.'

                    if (activeMessageId) {
                        setAssistantError(activeMessageId, message)
                    }
                } finally {
                    if (generationAbortControllerRef.current === abortController) {
                        generationAbortControllerRef.current = null
                        resetGenerationRefs()
                        setIsGenerating(false)
                    }
                }
            })()
        },
        [
            activeProjectId,
            activeProjectVersionId,
            abortGenerationRequest,
            appendAssistantChunk,
            appendGeneratedFileChunk,
            completeGeneratedFile,
            hydrateAppliedProjectChange,
            markGeneratedFileError,
            queryClient,
            resetGenerationRefs,
            setAssistantError,
            setAssistantAppliedFiles,
            setAssistantStatus,
            startGeneratedFile,
            setProjectLoadError,
            setMessages,
            activeAssistantMessageIdRef,
            setGenerationPhase,
            setActiveOperation,
            setCurrentGenerationFilePaths,
            setIsGenerating,
            setProjectType,
            generationAbortControllerRef,
        ]
    )

    const handleOutputPromptSubmit = React.useCallback(
        (prompt: string, selectedElement?: PreviewSelectedElement) => {
            requireAuthOr(() => {
                const normalizedPrompt = prompt.trim()

                if (!normalizedPrompt) {
                    return
                }

                if (!activeProjectId) {
                    handlePromptSubmit(normalizedPrompt)
                    return
                }

                outputOriginViewRef.current = view
                applyProjectChange({
                    kind: 'edit',
                    prompt: normalizedPrompt,
                    selectedElement,
                    visibleUserMessage: normalizedPrompt,
                    canvasState,
                })
            })
        },
        [
            activeProjectId,
            applyProjectChange,
            canvasState,
            handlePromptSubmit,
            view,
            requireAuthOr,
            outputOriginViewRef,
        ]
    )

    const handlePreviewRuntimeError = React.useCallback(
        (runtimeError: PreviewRuntimeError) => {
            requireAuthOr(() => {
                const isGenerating = useAppStore.getState().isGenerating
                if (!activeProjectId || isGenerating) {
                    return
                }

                const message = runtimeError.message.trim()

                if (!message) {
                    return
                }

                const signature = `${activeProjectVersionId ?? 'current'}:${message}`

                if (lastAutoFixSignatureRef.current === signature) {
                    return
                }

                lastAutoFixSignatureRef.current = signature
                outputOriginViewRef.current = view
                applyProjectChange({
                    kind: 'fix',
                    errorMessage: message,
                    stack: runtimeError.stack,
                    visibleUserMessage: `Fix preview error: ${message}`,
                })
            })
        },
        [
            activeProjectId,
            activeProjectVersionId,
            applyProjectChange,
            view,
            requireAuthOr,
            outputOriginViewRef,
            lastAutoFixSignatureRef,
        ]
    )

    return {
        handlePromptSubmit,
        handleOutputPromptSubmit,
        handlePreviewRuntimeError,
        applyProjectChange,
        startGeneration,
        resetGenerationRefs,
        abortGenerationRequest,
    }
}
