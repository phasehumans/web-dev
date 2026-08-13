import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'
import type { RefObject } from 'react'

export type PreviewDevice = 'desktop' | 'mobile' | 'tablet'
export type PreviewTab = 'preview' | 'code' | 'terminal'
export type GeneratedFileStatus = 'queued' | 'building' | 'done' | 'error'
export type OutputOperation = 'build' | 'edit' | 'fix'
export type PreviewRuntimeLifecycleState =
    | 'WaitingForRunnableVersion'
    | 'Bootstrapping'
    | 'Installing'
    | 'Starting'
    | 'Healthy'
    | 'Rebuilding'
    | 'Failed'
    | 'Stopped'
export type PreviewRuntimeBackendStatus = 'ready' | 'rebuilding' | 'failed'
export type PreviewRuntimeErrorClass =
    | 'temporary_partial_generation'
    | 'stable_compile_runtime'
    | 'dependency_install'
    | 'infra_runtime'

export interface GeneratedCode {
    html: string
    css: string
    js: string
}

export interface PreviewSelectedElement {
    tagName: string
    textContent: string
}

export interface PreviewRuntimeError {
    message: string
    stack?: string | null
}

export interface PreviewSessionError {
    class: PreviewRuntimeErrorClass
    code: string
    message: string
    detail?: string | null
    retryable: boolean
}

export interface PreviewSessionStatus {
    previewId: string
    projectId: string
    state: PreviewRuntimeLifecycleState
    backendStatus: PreviewRuntimeBackendStatus
    currentVersion?: string | null
    healthyVersion?: string | null
    previewUrl?: string | null
    lastError?: PreviewSessionError | null
    updatedAt: string
}

export interface GeneratedProjectFile {
    path: string
    content: string
    status: GeneratedFileStatus
    purpose?: string
    generator?: string
}

export interface WorkspaceScreenProps {
    onBack?: () => void
    onPromptSubmit: (
        prompt: string,
        options?: { selectedElement?: PreviewSelectedElement }
    ) => Promise<void> | void
    onRuntimeError?: (error: PreviewRuntimeError) => Promise<void> | void
    showStructureOnly?: boolean
    onSelectVersion?: (versionId: string) => void
    onDownload?: () => void
    onOpenFile?: (path: string) => void
}

export type OutputScreenProps = WorkspaceScreenProps

export interface WorkspaceHeaderProps {
    activeTab: PreviewTab
    setActiveTab: (tab: PreviewTab) => void
    device: PreviewDevice
    setDevice: (device: PreviewDevice) => void
    isSidebarCollapsed: boolean
    onToggleSidebar: () => void
    isPreviewCollapsed?: boolean
    onTogglePreview?: () => void
    onOpenNewTab: () => void
    onBack?: () => void
    projectName?: string | null
    projectId?: string | null
    versions?: BackendProjectVersionSummary[]
    activeVersionId?: string | null
    isVersionLoading?: boolean
    onSelectVersion?: (versionId: string) => void
    onDownload?: () => void
    onRefresh?: () => void
    sessionTag?: string | null
}

export type OutputHeaderProps = WorkspaceHeaderProps

export interface PreviewAreaProps {
    html: string
    isGenerating: boolean
    device: PreviewDevice
    isVisualMode: boolean
    onMessage: (event: MessageEvent) => void
    iframeRef: RefObject<HTMLIFrameElement>
    fullscreen?: boolean
    showStructureOnly?: boolean
    previewUrl?: string | null
    previewState?: PreviewRuntimeLifecycleState | null
    previewError?: PreviewSessionError | null
    previewSessionError?: string | null
    projectType?: 'generated' | 'github' | 'zip'
    projectId?: string | null
}

export interface PreviewWindowProps {
    code: string
    status: 'thinking' | 'done' | 'error'
    isSidebarCollapsed: boolean
    onToggleSidebar: () => void
    isVisualMode: boolean
    onElementSelected: (element: PreviewSelectedElement) => void
    onClearSelection: () => void
}

export type CodeFilePath = string
export type CodeFileLanguage = 'html' | 'css' | 'javascript' | 'typescript' | 'tsx'

export interface CodeWorkspaceProps {
    html: string
    generatedFiles?: Record<string, GeneratedProjectFile>
    activeFilePath?: CodeFilePath | null
    onHtmlChange?: (nextHtml: string) => void
}

export interface CodeFile {
    path: CodeFilePath
    label: string
    language: CodeFileLanguage
}

export interface CodeFileTreeFileNode {
    type: 'file'
    file: CodeFile
}

export interface CodeFileTreeFolderNode {
    type: 'folder'
    name: string
    path: string
    children: CodeFileTreeNode[]
}

export type CodeFileTreeNode = CodeFileTreeFileNode | CodeFileTreeFolderNode
