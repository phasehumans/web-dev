import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Profile } from '@/features/profile/types'

import { profileAPI } from '@/features/profile/api/profile'

const profileQueryKey = ['profile'] as const

type UseProfileSettingsDataOptions = {
    setProfileActionError: (message: string | null) => void
    onNameMutate: () => void
    onNameSuccess: () => void
    onUsernameMutate: () => void
    onPasswordSuccess: () => void
}

const getErrorMessage = (error: unknown, fallback: string) => {
    // check for apierror with zod validation details (fielderrors object)
    if (
        error &&
        typeof error === 'object' &&
        'details' in error &&
        error.details &&
        typeof error.details === 'object'
    ) {
        const details = error.details as Record<string, string[]>
        const messages: string[] = []
        for (const field of Object.keys(details)) {
            const fieldErrors = details[field]
            if (Array.isArray(fieldErrors)) {
                messages.push(...fieldErrors)
            }
        }
        if (messages.length > 0) {
            return messages.join('. ')
        }
    }

    if (error instanceof Error) {
        // don't show generic "validation failed" — we already tried details above
        if (error.message.toLowerCase() === 'validation failed') {
            return fallback
        }
        return error.message
    }

    return fallback
}

export const useProfileSettingsData = ({
    setProfileActionError,
    onNameMutate,
    onNameSuccess,
    onUsernameMutate,
    onPasswordSuccess,
}: UseProfileSettingsDataOptions) => {
    const queryClient = useQueryClient()

    const profileQuery = useQuery({
        queryKey: profileQueryKey,
        queryFn: profileAPI.getProfile,
        placeholderData: (previousData) => previousData,
    })

    const profile = profileQuery.data

    const updateNameMutation = useMutation({
        mutationFn: profileAPI.updateName,
        onMutate: async ({ name }) => {
            setProfileActionError(null)
            await queryClient.cancelQueries({ queryKey: profileQueryKey })

            const previousProfile = queryClient.getQueryData<Profile>(profileQueryKey)

            queryClient.setQueryData<Profile>(profileQueryKey, (currentProfile) =>
                currentProfile ? { ...currentProfile, name } : currentProfile
            )

            onNameMutate()

            return { previousProfile }
        },
        onError: (error, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileQueryKey, context.previousProfile)
            }

            setProfileActionError(getErrorMessage(error, 'Failed to update name'))
        },
        onSuccess: () => {
            setProfileActionError(null)
            onNameSuccess()
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: profileQueryKey })
        },
    })

    const updateUsernameMutation = useMutation({
        mutationFn: profileAPI.updateUsername,
        onMutate: async ({ username }) => {
            setProfileActionError(null)
            await queryClient.cancelQueries({ queryKey: profileQueryKey })

            const previousProfile = queryClient.getQueryData<Profile>(profileQueryKey)

            queryClient.setQueryData<Profile>(profileQueryKey, (currentProfile) =>
                currentProfile ? { ...currentProfile, githubUsername: username } : currentProfile
            )

            onUsernameMutate()

            return { previousProfile }
        },
        onError: (error, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileQueryKey, context.previousProfile)
            }

            setProfileActionError(getErrorMessage(error, 'Failed to update username'))
        },
        onSuccess: () => {
            setProfileActionError(null)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: profileQueryKey })
        },
    })

    const updatePasswordMutation = useMutation({
        mutationFn: profileAPI.changePassword,
        onSuccess: () => {
            setProfileActionError(null)
            onPasswordSuccess()
        },
        onError: (error) => {
            setProfileActionError(getErrorMessage(error, 'Failed to update password'))
        },
    })

    const updateNotificationMutation = useMutation({
        mutationFn: profileAPI.updateNotifications,
        onMutate: async (variables) => {
            setProfileActionError(null)

            await queryClient.cancelQueries({ queryKey: profileQueryKey })

            const previousProfile = queryClient.getQueryData<Profile>(profileQueryKey)

            queryClient.setQueryData<Profile>(profileQueryKey, (currentProfile) =>
                currentProfile ? { ...currentProfile, ...variables } : currentProfile
            )

            return { previousProfile }
        },
        onError: (error, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileQueryKey, context.previousProfile)
            }

            setProfileActionError(getErrorMessage(error, 'Failed to update notifications'))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: profileQueryKey })
        },
    })

    const updateGenerationSoundMutation = useMutation({
        mutationFn: profileAPI.updateGenerationSound,
        onMutate: async (variables) => {
            setProfileActionError(null)

            await queryClient.cancelQueries({ queryKey: profileQueryKey })

            const previousProfile = queryClient.getQueryData<Profile>(profileQueryKey)

            queryClient.setQueryData<Profile>(profileQueryKey, (currentProfile) =>
                currentProfile ? { ...currentProfile, ...variables } : currentProfile
            )

            return { previousProfile }
        },
        onError: (error, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileQueryKey, context.previousProfile)
            }

            setProfileActionError(getErrorMessage(error, 'Failed to update generation sound'))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: profileQueryKey })
        },
    })

    const completeOnboardingMutation = useMutation({
        mutationFn: profileAPI.completeOnboarding,
        onMutate: async () => {
            setProfileActionError(null)

            await queryClient.cancelQueries({ queryKey: profileQueryKey })

            const previousProfile = queryClient.getQueryData<Profile>(profileQueryKey)

            queryClient.setQueryData<Profile>(profileQueryKey, (currentProfile) =>
                currentProfile
                    ? { ...currentProfile, hasCompletedOnboarding: true }
                    : currentProfile
            )

            return { previousProfile }
        },
        onError: (error, _variables, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(profileQueryKey, context.previousProfile)
            }

            setProfileActionError(getErrorMessage(error, 'Failed to complete onboarding'))
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: profileQueryKey })
        },
    })

    return {
        profile,
        profileQuery,
        updateNameMutation,
        updateUsernameMutation,
        updatePasswordMutation,
        updateNotificationMutation,
        updateGenerationSoundMutation,
        completeOnboardingMutation,
    }
}
