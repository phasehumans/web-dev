import { Agent } from '@december/agent'
import { Message, AuthMode } from '@december/tui'
import { create } from 'zustand'

import { DecemberConfig } from '../config'

import type { SessionInfo } from '../file-session-repository'
import type { BackgroundTask } from '../task-manager'

export interface CliState {
    agent: Agent | null
    setAgent: (agent: Agent) => void
    settings: DecemberConfig | null
    setSettings: (settings: DecemberConfig) => void

    isAuthenticated: boolean
    setIsAuthenticated: (val: boolean) => void
    authMethod: 'byok' | 'december' | 'env' | undefined
    setAuthMethod: (method: 'byok' | 'december' | 'env' | undefined) => void
    hasBothAuth: boolean
    setHasBothAuth: (val: boolean) => void
    settingsAuthPriority: 'byok' | 'december'
    setSettingsAuthPriority: (val: 'byok' | 'december') => void
    currentEmail: string | undefined
    setCurrentEmail: (email: string | undefined) => void
    authMode: AuthMode
    setAuthMode: (mode: AuthMode) => void
    logoutItems: { label: string; value: string }[]
    setLogoutItems: (items: { label: string; value: string }[]) => void
    selectedProvider: string
    setSelectedProvider: (provider: string) => void
    activeModel: string
    setActiveModel: (model: string) => void
    apiKey: string
    setApiKey: (key: string) => void
    authError: string | null
    setAuthError: (err: string | null) => void
    openRouterModels: { label: string; value: string }[]
    setOpenRouterModels: (models: { label: string; value: string }[]) => void
    ollamaStatus: {
        running: boolean
        models: string[]
        compatibleModels: string[]
        baseUrl?: string
        error?: string
    } | null
    setOllamaStatus: (status: any) => void
    ollamaModels: { label: string; value: string }[]
    setOllamaModels: (models: { label: string; value: string }[]) => void

    // chat feature
    currentPlannedPrompt: string | null
    setCurrentPlannedPrompt: (prompt: string | null) => void
    grillMode: boolean
    setGrillMode: (mode: boolean) => void
    grillQuestions: { question: string; options: string[] }[]
    setGrillQuestions: (questions: { question: string; options: string[] }[]) => void
    currentGrillIndex: number
    setCurrentGrillIndex: (index: number) => void
    grillAnswers: string[]
    setGrillAnswers: (answers: string[]) => void
    grillPrompt: string | null
    setGrillPrompt: (prompt: string | null) => void
    customInputMode: boolean
    setCustomInputMode: (mode: boolean) => void
    customAnswer: string
    setCustomAnswer: (answer: string) => void
    staticMessages: Message[]
    setStaticMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void
    staticKey: number
    setStaticKey: (key: number | ((prev: number) => number)) => void
    activeMessages: Message[]
    setActiveMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void
    isStreaming: boolean
    setIsStreaming: (isStreaming: boolean) => void
    queuedPrompts: string[]
    setQueuedPrompts: (prompts: string[] | ((prev: string[]) => string[])) => void

    // sessions feature
    sessionItems: { label: string; value: string }[]
    setSessionItems: (items: { label: string; value: string }[]) => void
    sessionsData: SessionInfo[]
    setSessionsData: (data: SessionInfo[]) => void
    sessionPage: number
    setSessionPage: (page: number) => void
    sessionSelectedIndex: number
    setSessionSelectedIndex: (index: number) => void
    sessionRenameMode: boolean
    setSessionRenameMode: (mode: boolean) => void
    sessionNewName: string
    setSessionNewName: (name: string) => void

    // settings feature
    settingsNonWorkspace: boolean
    setSettingsNonWorkspace: (val: boolean) => void
    settingsToolPermission: 'always-ask' | 'always-proceed'
    setSettingsToolPermission: (val: 'always-ask' | 'always-proceed') => void
    settingsCompactMode: boolean
    setSettingsCompactMode: (val: boolean) => void
    settingsSoundEffects: boolean
    setSettingsSoundEffects: (val: boolean) => void
    settingsAutoScroll: boolean
    setSettingsAutoScroll: (val: boolean) => void
    settingsStreamSpeed: 'smooth' | 'instant'
    setSettingsStreamSpeed: (val: 'smooth' | 'instant') => void
    settingsSelectedIndex: number
    setSettingsSelectedIndex: (val: number) => void
    settingsDefaultModel: string
    setSettingsDefaultModel: (val: string) => void
    settingsMaxTokens: string
    setSettingsMaxTokens: (val: string) => void
    settingsThinkingLevel: 'auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high'
    setSettingsThinkingLevel: (val: 'auto' | 'off' | 'minimal' | 'low' | 'medium' | 'high') => void
    settingsSteeringMode: 'all' | 'one-at-a-time'
    setSettingsSteeringMode: (val: 'all' | 'one-at-a-time') => void
    settingsFollowUpMode: 'all' | 'one-at-a-time'
    setSettingsFollowUpMode: (val: 'all' | 'one-at-a-time') => void

    // tasks feature
    tasksData: BackgroundTask[]
    setTasksData: (data: BackgroundTask[]) => void
    taskSelectedIndex: number
    setTaskSelectedIndex: (index: number | ((prev: number) => number)) => void
    taskViewingId: string | null
    setTaskViewingId: (id: string | null) => void
    taskScrollOffset: number
    setTaskScrollOffset: (offset: number | ((prev: number) => number)) => void

    // interceptors (questions & permissions)
    pendingQuestions: {
        questions: Array<{ question: string; options: string[]; is_multi_select?: boolean }>
        resolve: (answer: string) => void
    } | null
    setPendingQuestions: (pendingQuestions: any) => void
    pendingToolCall: {
        toolCall: any
        resolve: (result: { block: boolean; reason?: string }) => void
    } | null
    setPendingToolCall: (pendingToolCall: any) => void

    toasts: { id: string; message: string; variant?: string }[]
    addToast: (message: string, variant?: string) => void
    removeToast: (id: string) => void
    shouldExit: boolean
    setShouldExit: (shouldExit: boolean) => void
}

export const useCliStore = create<CliState>((set) => ({
    // core
    agent: null,
    setAgent: (agent) => set({ agent }),
    settings: null,
    setSettings: (settings) => set({ settings }),

    // auth
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    authMethod: undefined,
    setAuthMethod: (authMethod) => set({ authMethod }),
    hasBothAuth: false,
    setHasBothAuth: (hasBothAuth) => set({ hasBothAuth }),
    settingsAuthPriority: 'byok',
    setSettingsAuthPriority: (settingsAuthPriority) => set({ settingsAuthPriority }),
    currentEmail: undefined,
    setCurrentEmail: (currentEmail) => set({ currentEmail }),
    authMode: 'none',
    setAuthMode: (authMode) => set({ authMode }),
    logoutItems: [],
    setLogoutItems: (logoutItems) => set({ logoutItems }),
    selectedProvider: '',
    setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
    activeModel: '',
    setActiveModel: (activeModel) => set({ activeModel }),
    apiKey: '',
    setApiKey: (apiKey) => set({ apiKey }),
    authError: null,
    setAuthError: (authError) => set({ authError }),
    openRouterModels: [],
    setOpenRouterModels: (openRouterModels) => set({ openRouterModels }),
    ollamaStatus: null,
    setOllamaStatus: (ollamaStatus) => set({ ollamaStatus }),
    ollamaModels: [],
    setOllamaModels: (ollamaModels) => set({ ollamaModels }),

    // chat
    currentPlannedPrompt: null,
    setCurrentPlannedPrompt: (currentPlannedPrompt) => set({ currentPlannedPrompt }),
    grillMode: false,
    setGrillMode: (grillMode) => set({ grillMode }),
    grillQuestions: [],
    setGrillQuestions: (grillQuestions) => set({ grillQuestions }),
    currentGrillIndex: 0,
    setCurrentGrillIndex: (currentGrillIndex) => set({ currentGrillIndex }),
    grillAnswers: [],
    setGrillAnswers: (grillAnswers) => set({ grillAnswers }),
    grillPrompt: null,
    setGrillPrompt: (grillPrompt) => set({ grillPrompt }),
    customInputMode: false,
    setCustomInputMode: (customInputMode) => set({ customInputMode }),
    customAnswer: '',
    setCustomAnswer: (customAnswer) => set({ customAnswer }),
    staticMessages: [{ id: 'header', role: 'header' }],
    setStaticMessages: (updater) =>
        set((state) => ({
            staticMessages: typeof updater === 'function' ? updater(state.staticMessages) : updater,
        })),
    staticKey: 0,
    setStaticKey: (updater) =>
        set((state) => ({
            staticKey: typeof updater === 'function' ? updater(state.staticKey) : updater,
        })),
    activeMessages: [],
    setActiveMessages: (updater) =>
        set((state) => ({
            activeMessages: typeof updater === 'function' ? updater(state.activeMessages) : updater,
        })),
    isStreaming: false,
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    queuedPrompts: [],
    setQueuedPrompts: (updater) =>
        set((state) => ({
            queuedPrompts: typeof updater === 'function' ? updater(state.queuedPrompts) : updater,
        })),

    // sessions
    sessionItems: [],
    setSessionItems: (sessionItems) => set({ sessionItems }),
    sessionsData: [],
    setSessionsData: (sessionsData) => set({ sessionsData }),
    sessionPage: 0,
    setSessionPage: (sessionPage) => set({ sessionPage }),
    sessionSelectedIndex: 0,
    setSessionSelectedIndex: (sessionSelectedIndex) => set({ sessionSelectedIndex }),
    sessionRenameMode: false,
    setSessionRenameMode: (sessionRenameMode) => set({ sessionRenameMode }),
    sessionNewName: '',
    setSessionNewName: (sessionNewName) => set({ sessionNewName }),

    // settings feature
    settingsNonWorkspace: false,
    setSettingsNonWorkspace: (settingsNonWorkspace) => set({ settingsNonWorkspace }),
    settingsToolPermission: 'always-proceed',
    setSettingsToolPermission: (settingsToolPermission) => set({ settingsToolPermission }),
    settingsCompactMode: false,
    setSettingsCompactMode: (settingsCompactMode) => set({ settingsCompactMode }),
    settingsSoundEffects: false,
    setSettingsSoundEffects: (settingsSoundEffects) => set({ settingsSoundEffects }),
    settingsAutoScroll: true,
    setSettingsAutoScroll: (settingsAutoScroll) => set({ settingsAutoScroll }),
    settingsStreamSpeed: 'smooth',
    setSettingsStreamSpeed: (settingsStreamSpeed) => set({ settingsStreamSpeed }),
    settingsSelectedIndex: 0,
    setSettingsSelectedIndex: (settingsSelectedIndex) => set({ settingsSelectedIndex }),
    settingsDefaultModel: '',
    setSettingsDefaultModel: (settingsDefaultModel) => set({ settingsDefaultModel }),
    settingsMaxTokens: '',
    setSettingsMaxTokens: (settingsMaxTokens) => set({ settingsMaxTokens }),
    settingsThinkingLevel: 'auto',
    setSettingsThinkingLevel: (settingsThinkingLevel) => set({ settingsThinkingLevel }),
    settingsSteeringMode: 'all',
    setSettingsSteeringMode: (settingsSteeringMode) => set({ settingsSteeringMode }),
    settingsFollowUpMode: 'all',
    setSettingsFollowUpMode: (settingsFollowUpMode) => set({ settingsFollowUpMode }),

    // tasks
    tasksData: [],
    setTasksData: (tasksData) => set({ tasksData }),
    taskSelectedIndex: 0,
    setTaskSelectedIndex: (updater) =>
        set((state) => ({
            taskSelectedIndex:
                typeof updater === 'function' ? updater(state.taskSelectedIndex) : updater,
        })),
    taskViewingId: null,
    setTaskViewingId: (taskViewingId) => set({ taskViewingId }),
    taskScrollOffset: 0,
    setTaskScrollOffset: (updater) =>
        set((state) => ({
            taskScrollOffset:
                typeof updater === 'function' ? updater(state.taskScrollOffset) : updater,
        })),

    // interceptors
    pendingQuestions: null,
    setPendingQuestions: (pendingQuestions) => set({ pendingQuestions }),
    pendingToolCall: null,
    setPendingToolCall: (pendingToolCall) => set({ pendingToolCall }),

    // cli events
    toasts: [],
    addToast: (message, variant = 'info') => {
        const id = Date.now().toString() + Math.random().toString()
        set((state) => ({
            toasts: [...state.toasts, { id, message, variant }],
        }))
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t: any) => t.id !== id) }))
        }, 3000)
    },
    removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t: any) => t.id !== id) })),
    shouldExit: false,
    setShouldExit: (shouldExit) => set({ shouldExit }),
}))
