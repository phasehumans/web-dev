import React from 'react'

import { useProfileSettingsData } from './useProfileSettingsData'

import { profileAPI } from '@/features/profile/api/profile'

export const useProfileSettingsController = () => {
    const [nameModalOpen, setNameModalOpen] = React.useState(false)
    const [tempName, setTempName] = React.useState('')
    const [passwordModalOpen, setPasswordModalOpen] = React.useState(false)
    const [showCurrentPass, setShowCurrentPass] = React.useState(false)
    const [showNewPass, setShowNewPass] = React.useState(false)
    const [currentPassword, setCurrentPassword] = React.useState('')
    const [newPassword, setNewPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [profileActionError, setProfileActionError] = React.useState<string | null>(null)

    const {
        profile,
        profileQuery: {
            isLoading: isProfileLoading,
            isFetching: isProfileFetching,
            error: profileError,
        },
        updateNameMutation,
        updateUsernameMutation,
        updatePasswordMutation,
        updateNotificationMutation,
        updateGenerationSoundMutation,
    } = useProfileSettingsData({
        setProfileActionError,
        onNameMutate: () => {},
        onNameSuccess: () => {
            setNameModalOpen(false)
        },
        onUsernameMutate: () => {},
        onPasswordSuccess: () => {
            setPasswordModalOpen(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        },
    })

    const isGithubConnected = profile?.githubConnected ?? false
    const isVercelConnected = profile?.vercelConnected ?? false
    const isSupabaseConnected = profile?.supabaseConnected ?? false
    const isNotionConnected = Boolean(profile?.notionWorkspaceId)
    const emailNotifications = profile?.notifyProjectActivity ?? true
    const productUpdates = profile?.notifyProductUpdates ?? true
    const securityAlerts = profile?.notifySecurityAlerts ?? true
    const generationSound = profile?.generationSound ?? 'FIRST_GENERATION'
    const resolvedName = profile?.name ?? 'User'

    const openNameModal = () => {
        setProfileActionError(null)
        setTempName(profile?.name ?? '')
        setNameModalOpen(true)
    }

    const openPasswordModal = () => {
        setProfileActionError(null)
        setPasswordModalOpen(true)
    }

    const handleSaveName = () => {
        if (!tempName.trim()) {
            return
        }

        updateNameMutation.mutate({ name: tempName.trim() })
    }

    const handleUpdatePassword = () => {
        if (!newPassword.trim()) {
            setProfileActionError('Please enter a new password')
            return
        }

        if (profile?.hasPassword && !currentPassword.trim()) {
            setProfileActionError('Please enter your current password')
            return
        }

        if (newPassword !== confirmPassword) {
            setProfileActionError('New password and confirm password do not match')
            return
        }

        setProfileActionError(null)
        updatePasswordMutation.mutate({
            currentPassword: profile?.hasPassword ? currentPassword : '',
            newPassword,
        })
    }

    const handleNotificationToggle = (
        field: 'notifyProjectActivity' | 'notifyProductUpdates' | 'notifySecurityAlerts',
        value: boolean
    ) => {
        updateNotificationMutation.mutate({
            [field]: value,
        })
    }

    const handleGenerationSoundChange = (value: 'FIRST_GENERATION' | 'ALWAYS' | 'NEVER') => {
        updateGenerationSoundMutation.mutate({
            generationSound: value,
        })
    }

    const redirectToIntegration = (getUrl: (userId: string) => string) => {
        if (!profile?.id) {
            setProfileActionError('Profile is still loading. Please try again.')
            return
        }

        setProfileActionError(null)
        window.location.href = getUrl(profile.id)
    }

    const connectGithub = () => {
        redirectToIntegration(profileAPI.getGithubConnectUrl)
    }

    const connectVercel = () => {
        redirectToIntegration(profileAPI.getVercelConnectUrl)
    }

    const connectSupabase = () => {
        redirectToIntegration(profileAPI.getSupabaseConnectUrl)
    }

    const connectNotion = () => {
        redirectToIntegration(profileAPI.getNotionConnectUrl)
    }

    return {
        profile,
        isProfileLoading,
        isProfileFetching,
        profileError,
        profileActionError,
        setProfileActionError,
        nameModalOpen,
        tempName,
        passwordModalOpen,
        showCurrentPass,
        showNewPass,
        currentPassword,
        newPassword,
        confirmPassword,
        setNameModalOpen,
        setTempName,
        setPasswordModalOpen,
        setShowCurrentPass,
        setShowNewPass,
        setCurrentPassword,
        setNewPassword,
        setConfirmPassword,
        updateNameMutation,
        updateUsernameMutation,
        updatePasswordMutation,
        updateNotificationMutation,
        updateGenerationSoundMutation,
        isGithubConnected,
        isVercelConnected,
        isSupabaseConnected,
        isNotionConnected,
        emailNotifications,
        productUpdates,
        securityAlerts,
        generationSound,
        resolvedName,
        openNameModal,
        openPasswordModal,
        handleSaveName,
        handleUpdatePassword,
        handleNotificationToggle,
        handleGenerationSoundChange,
        connectGithub,
        connectVercel,
        connectSupabase,
        connectNotion,
    }
}
