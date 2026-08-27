import type { BackendSessionVersionSummary } from '@/features/sessions/api/session'
import type { StateCreator } from 'zustand'

export interface SessionSlice {
    // Session identifiers
    activeSessionId: string | null
    activeSessionTitle: string | null
    sessionVersions: BackendSessionVersionSummary[]
    activeSessionVersionId: string | null
    isSessionOpening: boolean
    sessionLoadError: string | null

    // Session actions
    setActiveSessionId: (id: string | null) => void
    setActiveSessionTitle: (title: string | null) => void
    setSessionVersions: (versions: BackendSessionVersionSummary[]) => void
    setActiveSessionVersionId: (id: string | null) => void
    setIsSessionOpening: (isOpening: boolean) => void
    setSessionLoadError: (error: string | null) => void

    // Backward-compatibility aliases
    activeProjectId: string | null
    activeProjectName: string | null
    projectVersions: BackendSessionVersionSummary[]
    activeProjectVersionId: string | null
    isProjectOpening: boolean
    projectLoadError: string | null
    setActiveProjectId: (id: string | null) => void
    setActiveProjectName: (name: string | null) => void
    setProjectVersions: (versions: BackendSessionVersionSummary[]) => void
    setActiveProjectVersionId: (id: string | null) => void
    setIsProjectOpening: (isOpening: boolean) => void
    setProjectLoadError: (error: string | null) => void
}

export type ProjectSlice = SessionSlice

export const createProjectSlice: StateCreator<SessionSlice> = (set) => ({
    activeSessionId: null,
    activeSessionTitle: null,
    sessionVersions: [],
    activeSessionVersionId: null,
    isSessionOpening: false,
    sessionLoadError: null,

    setActiveSessionId: (id) => set({ activeSessionId: id, activeProjectId: id }),
    setActiveSessionTitle: (title) => set({ activeSessionTitle: title, activeProjectName: title }),
    setSessionVersions: (versions) => set({ sessionVersions: versions, projectVersions: versions }),
    setActiveSessionVersionId: (id) =>
        set({ activeSessionVersionId: id, activeProjectVersionId: id }),
    setIsSessionOpening: (isOpening) =>
        set({ isSessionOpening: isOpening, isProjectOpening: isOpening }),
    setSessionLoadError: (error) => set({ sessionLoadError: error, projectLoadError: error }),

    // Aliases syncing both
    activeProjectId: null,
    activeProjectName: null,
    projectVersions: [],
    activeProjectVersionId: null,
    isProjectOpening: false,
    projectLoadError: null,
    setActiveProjectId: (id) => set({ activeSessionId: id, activeProjectId: id }),
    setActiveProjectName: (name) => set({ activeSessionTitle: name, activeProjectName: name }),
    setProjectVersions: (versions) => set({ sessionVersions: versions, projectVersions: versions }),
    setActiveProjectVersionId: (id) =>
        set({ activeSessionVersionId: id, activeProjectVersionId: id }),
    setIsProjectOpening: (isOpening) =>
        set({ isSessionOpening: isOpening, isProjectOpening: isOpening }),
    setProjectLoadError: (error) => set({ sessionLoadError: error, projectLoadError: error }),
})
