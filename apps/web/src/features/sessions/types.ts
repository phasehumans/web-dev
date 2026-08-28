import type { FormEvent, MouseEvent } from 'react'

export interface Project {
    id: string
    title: string
    description: string
    createdAt: string
    updatedAt: string
    rawUpdatedAt: string
    isStarred: boolean
    versionCount: number
    currentVersionId: string | null
    createdByUsername: string
    status?: 'Draft' | 'Generating' | 'Generated' | 'Deployed' | 'Failed'
}

export interface ProjectListProps {
    onNewProject: () => void
    onOpenProject: (projectId: string) => void
}

export interface RenameModalState {
    isOpen: boolean
    project: Project | null
    value: string
}

export interface DeleteModalState {
    isOpen: boolean
    project: Project | null
}

export interface ProjectListRowProps {
    project: Project
    isMenuOpen: boolean
    isTogglePending: boolean
    onOpenProject: (projectId: string) => void
    onToggleStar: (id: string, event: MouseEvent) => void
    onToggleMenu: (id: string, event: MouseEvent) => void
    onOpenProjectFromMenu: (projectId: string, event: MouseEvent) => void
    onToggleStarFromMenu: (project: Project, event: MouseEvent) => void
    onOpenRename: (project: Project, event: MouseEvent) => void
    onOpenDelete: (project: Project, event: MouseEvent) => void
}

export interface ProjectRenameModalProps {
    isOpen: boolean
    value: string
    isPending: boolean
    onClose: () => void
    onChange: (nextValue: string) => void
    onSubmit: (event: FormEvent) => void
}

export interface ProjectDeleteModalProps {
    isOpen: boolean
    projectTitle?: string
    isPending: boolean
    onClose: () => void
    onConfirm: () => void
}

export type SessionRenameModalProps = ProjectRenameModalProps
export type SessionDeleteModalProps = ProjectDeleteModalProps
