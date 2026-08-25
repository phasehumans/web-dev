import React from 'react'

import type {
    GeneratedProjectFile,
    OutputOperation,
    PreviewDevice,
    PreviewRuntimeError,
    PreviewSelectedElement,
    PreviewSessionStatus,
    PreviewTab,
} from '@/features/preview/types'

import { PREVIEW_HTML } from '@/features/preview/constants/preview'

interface UseWorkspaceScreenControllerArgs {
    isGenerating: boolean
    generatedFiles?: Record<string, GeneratedProjectFile>
    activeGeneratedFilePath?: string | null
    generationPhase?: 'thinking' | 'building' | 'done' | null
    activeOperation?: OutputOperation | null
    onPromptSubmit: (
        prompt: string,
        options?: { selectedElement?: PreviewSelectedElement }
    ) => Promise<void> | void
    onRuntimeError?: (error: PreviewRuntimeError) => Promise<void> | void
    previewSession?: PreviewSessionStatus | null
}

const getPreviewHtmlFromFiles = (generatedFiles?: Record<string, GeneratedProjectFile>) => {
    if (!generatedFiles) {
        return ''
    }

    let html =
        generatedFiles['index.html']?.content ||
        generatedFiles['public/index.html']?.content ||
        generatedFiles['web/index.html']?.content ||
        generatedFiles['src/index.html']?.content

    if (!html) {
        // fallback: find any index.html
        const anyIndexHtml = Object.values(generatedFiles).find((f) =>
            f.path.endsWith('index.html')
        )
        if (anyIndexHtml) {
            html = anyIndexHtml.content
        } else {
            // fallback: find any .html file
            const anyHtml = Object.values(generatedFiles).find((f) => f.path.endsWith('.html'))
            html = anyHtml?.content || ''
        }
    }

    const cssContents = Object.values(generatedFiles)
        .filter((file) => file.path.endsWith('.css') && file.content)
        .map((file) => file.content)

    if (cssContents.length > 0 && html) {
        const styleTag = `\n<style>\n${cssContents.join('\n')}\n</style>\n`
        if (/<\/head>/i.test(html)) {
            html = html.replace(/<\/head>/i, () => `${styleTag}</head>`)
        } else {
            html += styleTag
        }
    }

    return html
}

export const useWorkspaceScreenController = ({
    isGenerating,
    generatedFiles,
    activeOperation,
    onPromptSubmit,
    onRuntimeError,
    previewSession,
}: UseWorkspaceScreenControllerArgs) => {
    const [activeTab, setActiveTab] = React.useState<PreviewTab>('preview')
    const [device, setDevice] = React.useState<PreviewDevice>('desktop')
    const [previewHtml, setPreviewHtml] = React.useState(PREVIEW_HTML)
    const [isVisualMode, setIsVisualMode] = React.useState(false)
    const [selectedElement, setSelectedElement] = React.useState<PreviewSelectedElement | null>(
        null
    )
    const [editPrompt, setEditPrompt] = React.useState('')
    const [isApplyingEdit, setIsApplyingEdit] = React.useState(false)
    const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = React.useState(false)
    const [executionTime, setExecutionTime] = React.useState(0)
    const iframeRef = React.useRef<HTMLIFrameElement>(null)
    const hasSwitchedToCodeForBuildRef = React.useRef(false)

    React.useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768) {
                setIsChatSidebarCollapsed(true)
                setDevice('mobile')
            }
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    React.useEffect(() => {
        if (!isGenerating) {
            setIsApplyingEdit(false)
            return
        }

        const start = Date.now()
        const timerInterval = setInterval(() => {
            setExecutionTime((Date.now() - start) / 1000)
        }, 100)

        hasSwitchedToCodeForBuildRef.current = false
        setActiveTab((prev) => (activeOperation === 'build' || !activeOperation ? 'preview' : prev))

        return () => {
            clearInterval(timerInterval)
        }
    }, [activeOperation, isGenerating])

    React.useEffect(() => {
        if (!isGenerating && previewSession?.backendStatus === 'ready') {
            setActiveTab('preview')
        }
    }, [isGenerating, previewSession?.backendStatus])

    React.useEffect(() => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                {
                    type: 'toggle-visual-mode',
                    isActive: isVisualMode,
                },
                '*'
            )

            if (!isVisualMode) {
                setSelectedElement(null)
            }
        }
    }, [isVisualMode])

    React.useEffect(() => {
        const generatedPreviewHtml = getPreviewHtmlFromFiles(generatedFiles)

        if (generatedPreviewHtml.trim()) {
            setPreviewHtml(generatedPreviewHtml)
            return
        }

        setPreviewHtml(PREVIEW_HTML)
    }, [generatedFiles])

    const handleIframeMessage = React.useCallback(
        (event: MessageEvent) => {
            if (event.data?.type === 'element-selected') {
                setSelectedElement(event.data)
                return
            }

            if (event.data?.type === 'selection-cleared') {
                setSelectedElement(null)
                return
            }

            if (event.data?.type === 'runtime-error' && onRuntimeError) {
                void onRuntimeError({
                    message: event.data.message,
                    stack: event.data.stack,
                })
            }
        },
        [onRuntimeError]
    )

    const handleApplyEdit = React.useCallback(async () => {
        const nextPrompt = editPrompt.trim()

        if (!nextPrompt) {
            return
        }

        setIsApplyingEdit(true)
        let didApply = false

        try {
            await Promise.resolve(
                onPromptSubmit(nextPrompt, {
                    ...(selectedElement ? { selectedElement } : {}),
                })
            )
            didApply = true
        } finally {
            setIsApplyingEdit(false)

            if (didApply) {
                setEditPrompt('')
                setSelectedElement(null)

                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({ type: 'selection-cleared' }, '*')
                }
            }
        }
    }, [editPrompt, onPromptSubmit, selectedElement])

    const handleClearSelection = () => {
        setSelectedElement(null)

        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'selection-cleared' }, '*')
        }
    }

    const handleOpenInNewTab = () => {
        if (previewSession?.previewUrl) {
            window.open(previewSession.previewUrl, '_blank', 'noopener,noreferrer')
            return
        }

        const newWindow = window.open('', '_blank')

        if (newWindow) {
            newWindow.document.write(previewHtml)
            newWindow.document.close()
        }
    }

    const handleRefreshPreview = React.useCallback(() => {
        window.dispatchEvent(new CustomEvent('december-preview-refresh-triggered'))
        if (iframeRef.current) {
            try {
                if (iframeRef.current.contentWindow) {
                    iframeRef.current.contentWindow.location.reload()
                }
            } catch (e) {
                if (iframeRef.current.src) {
                    const src = iframeRef.current.src
                    iframeRef.current.src = ''
                    iframeRef.current.src = src
                } else if (iframeRef.current.srcdoc) {
                    const srcdoc = iframeRef.current.srcdoc
                    iframeRef.current.srcdoc = ''
                    iframeRef.current.srcdoc = srcdoc
                }
            }
        }
    }, [])

    return {
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
        executionTime,
        iframeRef,
        handleIframeMessage,
        handleApplyEdit,
        handleClearSelection,
        handleOpenInNewTab,
        handleRefreshPreview,
    }
}

export const useOutputScreenController = useWorkspaceScreenController
