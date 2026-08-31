import { useQueryClient } from '@tanstack/react-query'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { useAppStore } from '@/app/store'
import { getPathForView, type ViewState } from '@/app/types'
import { previewAPI } from '@/features/preview/api'
import { profileAPI } from '@/features/profile/api/profile'

export const useNavigationController = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const {
        activeProjectId,
        setActiveProjectId,
        setActiveProjectName,
        setActiveProjectVersionId,
        setMessages,
        setGeneratedFiles,
        setCurrentGenerationFilePaths,
        setGenerationPhase,
        setActiveOperation,
        setProjectVersions,
        setImportState,
        setIsAuthenticated,
        setShowAuthModal,
        isAuthenticated,
    } = useAppStore()

    const clearOpenedProject = React.useCallback(() => {
        setActiveProjectId(null)
        setActiveProjectName(null)
        setActiveProjectVersionId(null)
        setProjectVersions([])
    }, [setActiveProjectId, setActiveProjectName, setActiveProjectVersionId, setProjectVersions])

    const resetGenerationFlow = React.useCallback(() => {
        setGeneratedFiles({})
        setCurrentGenerationFilePaths([])
        setGenerationPhase(null)
        setActiveOperation(null)
    }, [setGeneratedFiles, setCurrentGenerationFilePaths, setGenerationPhase, setActiveOperation])

    const requireAuthOr = React.useCallback(
        (action: () => void) => {
            if (isAuthenticated) {
                action()
            } else {
                setShowAuthModal(true)
            }
        },
        [isAuthenticated, setShowAuthModal]
    )

    const handleNewThread = React.useCallback(() => {
        if (activeProjectId) {
            void previewAPI.stopPreview(activeProjectId).catch((err) => {
                console.error('Failed to stop preview:', err)
            })
        }
        setMessages([])
        clearOpenedProject()
        resetGenerationFlow()
        setImportState({ status: 'idle', message: null })
        navigate('/')
    }, [
        activeProjectId,
        setMessages,
        clearOpenedProject,
        resetGenerationFlow,
        setImportState,
        navigate,
    ])

    const handleHomeClick = React.useCallback(() => {
        if (activeProjectId) {
            void previewAPI.stopPreview(activeProjectId).catch((err) => {
                console.error('Failed to stop preview:', err)
            })
        }
        setMessages([])
        clearOpenedProject()
        resetGenerationFlow()
        setImportState({ status: 'idle', message: null })
        navigate('/')
    }, [
        activeProjectId,
        setMessages,
        clearOpenedProject,
        resetGenerationFlow,
        setImportState,
        navigate,
    ])

    const handleNavigate = React.useCallback(
        (target: ViewState) => {
            requireAuthOr(() => {
                navigate(getPathForView(target))
            })
        },
        [navigate, requireAuthOr]
    )

    const handleSignOut = React.useCallback(() => {
        void profileAPI.signout().catch(() => {})
        setIsAuthenticated(false)
        queryClient.removeQueries({ queryKey: ['sessions'] })
        queryClient.removeQueries({ queryKey: ['profile'] })
        navigate('/')
    }, [setIsAuthenticated, queryClient, navigate])

    const onOpenAuth = React.useCallback(() => {
        setShowAuthModal(true)
    }, [setShowAuthModal])

    return {
        handleNewThread,
        handleHomeClick,
        handleNavigate,
        handleSignOut,
        onOpenAuth,
        isAuthenticated,
        requireAuthOr,
    }
}
