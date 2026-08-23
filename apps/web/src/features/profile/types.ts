import type { ReactNode } from 'react'

export interface Profile {
    id: string
    name: string
    email: string
    username: string
    createdAt: string
    updatedAt: string
    emailVerified: boolean
    receiveNotification: boolean
    googleId: string | null
    githubConnected: boolean
    githubUsername?: string
    vercelConnected?: boolean
    vercelTeamId?: string | null
    vercelConfigurationId?: string | null
    supabaseConnected?: boolean
    supabaseUserId?: string | null
    supabaseConnectedAt?: string | null
    notionWorkspaceId?: string | null
    notionWorkspaceName?: string | null
    hasPassword?: boolean
}

export interface UpdateNameInput {
    name: string
}

export interface ChangePasswordInput {
    currentPassword?: string
    newPassword: string
}

export interface UpdateNotificationInput {
    receiveNotification: boolean
}

export interface ProfileSettingsProps {
    onSignOut: () => void
    onBack?: () => void
}

export interface ProfileNameModalProps {
    isOpen: boolean
    value: string
    isPending: boolean
    title?: string
    label?: string
    errorMessage?: string | null
    onClose: () => void
    onChange: (value: string) => void
    onSave: () => void
}

export interface ProfilePasswordModalProps {
    isOpen: boolean
    isPending: boolean
    currentPassword: string
    newPassword: string
    confirmPassword: string
    showCurrentPass: boolean
    showNewPass: boolean
    errorMessage?: string | null
    onClose: () => void
    onUpdatePassword: () => void
    onCurrentPasswordChange: (value: string) => void
    onNewPasswordChange: (value: string) => void
    onConfirmPasswordChange: (value: string) => void
    onToggleShowCurrentPass: () => void
    onToggleShowNewPass: () => void
    hasPassword?: boolean
}

export interface SettingsRowProps {
    label: string
    description?: string
    action: ReactNode
    className?: string
}

export interface SettingsSectionProps {
    title: string
    children: ReactNode
}
