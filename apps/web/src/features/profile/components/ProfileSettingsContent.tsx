import { useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'

import type { Profile } from '../types'

import { profileAPI } from '@/features/profile/api/profile'

interface ProfileSettingsContentProps {
    profile?: Profile
    resolvedName: string
    hasProfile: boolean
    isGithubConnected: boolean
    onOpenNameModal: () => void
    onOpenUsernameModal: () => void
    onOpenPasswordModal: () => void
    onConnectGithub: () => void
    onSignOut: () => void
    onOpenSignOutAllSessionsModal: () => void
    onOpenDeleteAccountModal: () => void
}

export const ProfileSettingsContent: React.FC<ProfileSettingsContentProps> = (props) => {
    const {
        profile,
        resolvedName,
        hasProfile,
        isGithubConnected,
        onOpenNameModal,
        onOpenUsernameModal,
        onOpenPasswordModal,
        onConnectGithub,
        onSignOut,
        onOpenSignOutAllSessionsModal,
        onOpenDeleteAccountModal,
    } = props

    const queryClient = useQueryClient()
    const updateAvatarMutation = useMutation({
        mutationFn: profileAPI.updateAvatarUrl,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })

    const userName = profile?.name || resolvedName || 'User'
    const userUsername = profile?.username || ''
    const displayUsername = userUsername || userName.toLowerCase().replace(/\s+/g, '_')

    const handleChangeAvatar = () => {
        const randomSeed = Math.random().toString(36).substring(2, 8)
        const newUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${randomSeed}&backgroundColor=2B2A29`
        updateAvatarMutation.mutate({ avatarUrl: newUrl })
    }

    const currentAvatarUrl =
        profile?.avatarUrl ||
        `https://api.dicebear.com/7.x/notionists/svg?seed=${userName}&backgroundColor=2B2A29`

    const joinDateStr = profile?.createdAt
        ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
              new Date(profile.createdAt)
          )
        : ''

    const isLoading = !hasProfile && !resolvedName

    return (
        <div className="flex flex-col w-full max-w-[800px] text-[#D6D5C9]">
            {/* account */}
            <div className="flex flex-col mb-6">
                <h1 className="text-[16px] font-medium mb-3">Account</h1>
                <div className="flex flex-col gap-2 border-t border-[#242323] pt-4">
                    {/* full name row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Full Name</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                {profile?.name || resolvedName}
                            </span>
                        </div>
                        <button
                            onClick={onOpenNameModal}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            Change full name
                        </button>
                    </div>

                    {/* username row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Username</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                {profile?.username || 'username'}
                            </span>
                        </div>
                        <button
                            onClick={onOpenUsernameModal}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            Change username
                        </button>
                    </div>

                    {/* email row */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Email</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                {profile?.email || 'No email set'}
                            </span>
                        </div>
                    </div>

                    {/* change password row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Password</span>
                            {profile?.hasPassword ? (
                                <span className="text-[13px] text-[#7B7A79]">••••••••</span>
                            ) : (
                                <span className="text-[13px] text-[#8F8E8D]">
                                    No password set (Oauth-only user)
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onOpenPasswordModal}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            {profile?.hasPassword ? 'Change password' : 'Set password'}
                        </button>
                    </div>
                </div>
            </div>

            {/* system */}
            <div className="flex flex-col mb-6">
                <h2 className="text-[16px] font-medium text-[#D6D5C9] mb-3">System</h2>
                <div className="flex flex-col gap-6 sm:gap-2 border-t border-[#242323] pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <span className="text-[14px] text-[#D6D5C9]">
                            You are signed in as {profile?.username || profile?.name || 'User'}
                        </span>
                        <button
                            onClick={onSignOut}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            Sign out
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">
                                Sign out of all sessions
                            </span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Devices or browsers where you are signed in
                            </span>
                        </div>
                        <button
                            onClick={onOpenSignOutAllSessionsModal}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            Sign out of all sessions
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-[#D6D5C9]">Delete account</span>
                            <span className="text-[13px] text-[#7B7A79]">
                                Permanently delete your account and data
                            </span>
                        </div>
                        <button
                            onClick={onOpenDeleteAccountModal}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg border border-[#383736] text-[13px] text-[#D6D5C9] hover:bg-[#242323] transition-colors"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
