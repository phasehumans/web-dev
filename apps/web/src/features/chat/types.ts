export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    thoughts?: string
    plan?: string
    summary?: string
    type?: 'text' | 'code_preview'
    code?: string
    status?: 'thinking' | 'building' | 'done' | 'error'
    statusMessage?: string
    tokensUsed?: number
    creditsUsed?: number
    modelName?: string
    appliedFiles?: string[]
}

export interface SelectedElement {
    tagName: string
    textContent: string
}

export interface ChatMessageProps {
    role: 'user' | 'assistant'
    content: string
    thoughts?: string
    plan?: string
    summary?: string
    isGenerating: boolean
    executionTime: number
    index: number
    status?: 'thinking' | 'building' | 'done' | 'error'
    statusMessage?: string
    generatedFiles?: Record<string, any>
    appliedFiles?: string[]
    projectType?: 'generated' | 'github' | 'zip'
    tokensUsed?: number
    creditsUsed?: number
    onTriggerSimulation?: (type: 'generated' | 'github' | 'zip') => void
    onOpenFile?: (path: string) => void
    projectId?: string | null
}

export interface ChatPromptInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    isVisualMode: boolean
    onToggleVisualMode: () => void
    selectedElement: SelectedElement | null
    onClearSelection: () => void
    isApplyingEdit: boolean
    isAuthenticated?: boolean
    onOpenAuth?: () => void
}

export interface ChatSidebarProps {
    messages: Message[]
    onPromptSubmit: (prompt: string) => void
    onBack: () => void
    isGenerating: boolean
    steps: string[]
    executionTime: number
    isThoughtsOpen: boolean
    setIsThoughtsOpen: (value: boolean) => void
    editPrompt: string
    setEditPrompt: (value: string) => void
    handleApplyEdit: () => void
    isVisualMode: boolean
    setIsVisualMode: (value: boolean) => void
    selectedElement: SelectedElement | null
    handleClearSelection: () => void
    isApplyingEdit: boolean
    isCollapsed: boolean
    onClose?: () => void
    mode?: 'sidebar' | 'mobile'
    projectName?: string | null
    generatedFiles?: Record<string, any>
    projectType?: 'generated' | 'github' | 'zip'
    onTriggerSimulation?: (type: 'generated' | 'github' | 'zip') => void
    onOpenFile?: (path: string) => void
    isAuthenticated?: boolean
    onOpenAuth?: () => void
    projectId?: string | null
    customWidth?: number
    isDragging?: boolean
    isPreviewCollapsed?: boolean
    onTogglePreview?: () => void
    activeVersionId?: string | null
    sessionTag?: string | null
}
