import type { BackendProjectVersionSummary } from '@/features/sessions/api/project'
import type { StateCreator } from 'zustand'

export interface ProjectSlice {
    activeProjectId: string | null
    activeProjectName: string | null
    projectVersions: BackendProjectVersionSummary[]
    activeProjectVersionId: string | null
    isProjectOpening: boolean
    projectLoadError: string | null
    setActiveProjectId: (id: string | null) => void
    setActiveProjectName: (name: string | null) => void
    setProjectVersions: (versions: BackendProjectVersionSummary[]) => void
    setActiveProjectVersionId: (id: string | null) => void
    setIsProjectOpening: (isOpening: boolean) => void
    setProjectLoadError: (error: string | null) => void
}

export const createProjectSlice: StateCreator<ProjectSlice> = (set) => ({
    activeProjectId: null,
    activeProjectName: null,
    projectVersions: [],
    activeProjectVersionId: null,
    isProjectOpening: false,
    projectLoadError: null,
    setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
    setActiveProjectName: (activeProjectName) => set({ activeProjectName }),
    setProjectVersions: (projectVersions) => set({ projectVersions }),
    setActiveProjectVersionId: (activeProjectVersionId) => set({ activeProjectVersionId }),
    setIsProjectOpening: (isProjectOpening) => set({ isProjectOpening }),
    setProjectLoadError: (projectLoadError) => set({ projectLoadError }),
})
