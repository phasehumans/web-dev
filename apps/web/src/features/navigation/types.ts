import type { ReactNode } from 'react'

export interface NavigationState {
    isCollapsed: boolean
}

export interface SidebarProps {
    onNewThread: () => void
    onAllProjects: () => void
    onSessions?: () => void
    onProfile: () => void
    onOpenProject: (projectId: string) => void
    isAuthenticated: boolean
    onOpenAuth: () => void
    onSignOut?: () => void
    onHomeClick?: () => void
}

export interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
    onNewThread: () => void
    onAllProjects: () => void
    onSessions?: () => void
    onProfile: () => void
    onOpenProject: (projectId: string) => void
    isAuthenticated: boolean
    onOpenAuth: () => void
    onSignOut?: () => void
}

export interface SidebarHeaderProps {
    isCollapsed: boolean
    onToggleCollapse: () => void
    onNewThread: () => void
}

export interface SidebarFooterProps {
    isAuthenticated: boolean
    isCollapsed: boolean
    onProfile: () => void
    onOpenAuth: () => void
}

export interface SidebarNavItemProps {
    icon: ReactNode
    label: string
    active?: boolean
    collapsed?: boolean
    onClick?: () => void
}

export interface SidebarProjectItemProps {
    id: string
    title: string
    onClick: (projectId: string) => void
}

export interface SidebarSectionHeaderProps {
    label: string
    icon: ReactNode
    collapsed?: boolean
    isOpen?: boolean
    onToggle: () => void
}
