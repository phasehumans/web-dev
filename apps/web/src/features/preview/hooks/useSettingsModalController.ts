import { useState, useEffect } from 'react'

import { toProjectSlug } from '@/app/types'
import { profileAPI, type Profile } from '@/features/profile/api/profile'
import { projectAPI } from '@/features/sessions/api/project'
import { API_BASE_URL } from '@/shared/api/client'

export const useSettingsModalController = (
    initialTab: string,
    projectName: string,
    projectId?: string | null,
    onClose?: () => void
) => {
    const [activeTab, setActiveTab] = useState(initialTab)
    const [projName, setProjName] = useState(projectName)
    const [projDesc, setProjDesc] = useState('')
    const [category, setCategory] = useState<any>('NONE')
    const [isFavorite, setIsFavorite] = useState(false)
    const [isTemplate, setIsTemplate] = useState(false)
    const [visibility, setVisibility] = useState<'private' | 'link' | 'public'>('link')

    // toggles state
    const [analytics, setAnalytics] = useState(true)

    // collaborators mock state
    const [email, setEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('edit')

    // publish states
    const [deploying, setDeploying] = useState(false)
    const [deployed, setDeployed] = useState(false)
    const [buildLogs, setBuildLogs] = useState<string[]>([])
    const [deployError, setDeployError] = useState<string | null>(null)
    const [vercelDeploymentUrl, setVercelDeploymentUrl] = useState<string | null>(null)
    const [vercelLastDeployedAt, setVercelLastDeployedAt] = useState<string | null>(null)

    // modals state
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [hasSavedChanges, setHasSavedChanges] = useState(false)

    // github integration states
    const [project, setProject] = useState<any>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [githubRepoName, setGithubRepoName] = useState('')
    const [githubIsPrivate, setGithubIsPrivate] = useState(true)
    const [isCreatingRepo, setIsCreatingRepo] = useState(false)
    const [isSyncingRepo, setIsSyncingRepo] = useState(false)
    const [githubCommitMsg, setGithubCommitMsg] = useState('feat: sync project changes')
    const [githubSyncError, setGithubSyncError] = useState<string | null>(null)
    const [githubSyncSuccess, setGithubSyncSuccess] = useState(false)

    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)

    const slugifyRepoName = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9_.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    useEffect(() => {
        profileAPI
            .getProfile()
            .then((res) => {
                setProfile(res)
            })
            .catch((err) => console.error('Failed to load profile:', err))
    }, [])

    useEffect(() => {
        if (!projectId) return
        setIsLoading(true)
        projectAPI
            .getProject(projectId)
            .then((res) => {
                if (res?.project) {
                    setProject(res.project)
                    setProjName(res.project.name)
                    setProjDesc(res.project.description ?? '')
                    setIsFavorite(res.project.isStarred)
                    setIsTemplate(res.project.isSharedAsTemplate)
                    setCategory((res.project as any).projectCategory ?? 'NONE')
                    setGithubRepoName(slugifyRepoName(res.project.name))
                    setGithubIsPrivate(true)
                    setVercelDeploymentUrl(res.project.vercelDeploymentUrl ?? null)
                    setVercelLastDeployedAt(res.project.vercelLastDeployedAt ?? null)
                }
            })
            .catch((err) => console.error('Failed to load project details:', err))
            .finally(() => setIsLoading(false))
    }, [projectId])

    const handleConnectGithub = () => {
        if (!profile) return
        window.location.href = profileAPI.getGithubConnectUrl(profile.id)
    }

    const handleConnectVercel = () => {
        if (!profile) return
        window.location.href = profileAPI.getVercelConnectUrl(profile.id)
    }

    const handleCreateGithubRepo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!projectId || !githubRepoName.trim()) return
        setIsCreatingRepo(true)
        setGithubSyncError(null)
        try {
            const updatedProject = await profileAPI.createGithubRepo(projectId, {
                name: githubRepoName.trim(),
                private: githubIsPrivate,
                description: `December project - ${projName}`,
            })
            setProject(updatedProject)
            setGithubSyncSuccess(true)
            setTimeout(() => setGithubSyncSuccess(false), 3000)
        } catch (err: any) {
            setGithubSyncError(err.message || 'Failed to create GitHub repository')
        } finally {
            setIsCreatingRepo(false)
        }
    }

    const handleSyncGithubRepo = async () => {
        if (!projectId) return
        setIsSyncingRepo(true)
        setGithubSyncError(null)
        try {
            const updatedProject = await profileAPI.syncGithubRepo(projectId, {
                commitMessage: githubCommitMsg,
            })
            setProject(updatedProject)
            setGithubSyncSuccess(true)
            setTimeout(() => setGithubSyncSuccess(false), 3000)
        } catch (err: any) {
            setGithubSyncError(err.message || 'Failed to sync with GitHub')
        } finally {
            setIsSyncingRepo(false)
        }
    }

    const handleDeploy = async () => {
        if (!projectId) return
        setDeploying(true)
        setDeployed(false)
        setDeployError(null)
        setBuildLogs([])

        try {
            setBuildLogs((prev) => [
                ...prev,
                '[system] Preparing repository and auto-deployment...',
            ])

            const result = await projectAPI.deployToVercel(projectId)
            const { deploymentId, url } = result

            setBuildLogs((prev) => [
                ...prev,
                `[system] Auto-deployment triggered (ID: ${deploymentId})...`,
            ])

            const logsUrl = `${API_BASE_URL}/platform/deployments/${deploymentId}/logs`
            const eventSource = new EventSource(logsUrl, { withCredentials: true })

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'stdout' || data.type === 'stderr') {
                        const line = data.payload.text
                        setBuildLogs((prev) => [...prev, line.trim()])
                    } else if (data.type === 'error') {
                        setBuildLogs((prev) => [...prev, `❌ Error: ${data.payload.text}`])
                        setDeployError(data.payload.text)
                    }
                } catch (e) {
                    setBuildLogs((prev) => [...prev, event.data])
                }
            }

            eventSource.onerror = (err) => {
                console.error('Logs EventSource error:', err)
                eventSource.close()
            }

            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await projectAPI.getVercelDeploymentStatus(deploymentId)
                    const { readyState, url: deploymentUrl } = statusRes

                    if (readyState === 'READY') {
                        clearInterval(pollInterval)
                        eventSource.close()
                        setDeploying(false)
                        setDeployed(true)
                        setVercelDeploymentUrl(deploymentUrl)
                        setVercelLastDeployedAt(new Date().toISOString())
                        setBuildLogs((prev) => [
                            ...prev,
                            `🎉 Deployment ready! Live at: https://${deploymentUrl}`,
                        ])
                    } else if (readyState === 'ERROR' || readyState === 'CANCELED') {
                        clearInterval(pollInterval)
                        eventSource.close()
                        setDeploying(false)
                        setDeployError(`Deployment failed with status: ${readyState}`)
                        setBuildLogs((prev) => [...prev, `❌ Vercel build failed (${readyState}).`])
                    }
                } catch (err: any) {
                    console.error('Error polling status:', err)
                    clearInterval(pollInterval)
                    eventSource.close()
                    setDeploying(false)
                    setDeployError(err.message || 'Error tracking deployment')
                }
            }, 3000)
        } catch (err: any) {
            setDeploying(false)
            setDeployError(err.message || 'Failed to trigger Vercel deployment')
            setBuildLogs((prev) => [...prev, `❌ Error: ${err.message || 'Failed to deploy'}`])
        }
    }

    const handleSaveChanges = async () => {
        if (!projectId) return
        setIsSaving(true)
        try {
            await projectAPI.updateGeneralSettings(projectId, {
                name: projName,
                description: projDesc || null,
                isStarred: isFavorite,
                isSharedAsTemplate: isTemplate,
                projectCategory: category,
            })
            setHasSavedChanges(true)
        } catch (err) {
            console.error('Failed to save project settings:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        if (hasSavedChanges) {
            if (
                window.location.pathname.startsWith('/sessions/') ||
                window.location.pathname.startsWith('/session/') ||
                window.location.pathname.startsWith('/project/')
            ) {
                const slug = toProjectSlug(projName)
                window.location.href = `/sessions/${slug}`
            } else {
                window.location.reload()
            }
        } else {
            onClose?.()
        }
    }

    const handleDuplicateConfirm = async (newName: string) => {
        if (!projectId) return
        setIsDuplicating(true)
        try {
            const res = await projectAPI.duplicateProject(projectId, newName.trim() || undefined)
            if (res?.id) {
                window.location.href = `/sessions/${res.id}`
            }
        } catch (err) {
            console.error('Failed to duplicate project:', err)
        } finally {
            setIsDuplicating(false)
            setIsDuplicateModalOpen(false)
        }
    }

    const handleShareConfirm = async (selectedCategory?: string) => {
        if (!projectId) return
        try {
            await projectAPI.updateGeneralSettings(projectId, {
                isSharedAsTemplate: !isTemplate,
                projectCategory: (selectedCategory as any) ?? 'NONE',
            })
            setIsTemplate(!isTemplate)
            if (selectedCategory) {
                setCategory((selectedCategory as any) ?? 'NONE')
            }
        } catch (err) {
            console.error('Failed to share project:', err)
        } finally {
            setIsShareModalOpen(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!projectId) return
        try {
            await projectAPI.deleteProject(projectId)
            window.location.href = '/'
        } catch (err) {
            console.error('Failed to delete project:', err)
        } finally {
            setIsDeleteModalOpen(false)
        }
    }

    return {
        activeTab,
        setActiveTab,
        projName,
        setProjName,
        projDesc,
        setProjDesc,
        category,
        setCategory,
        isFavorite,
        setIsFavorite,
        isTemplate,
        setIsTemplate,
        visibility,
        setVisibility,
        analytics,
        setAnalytics,
        email,
        setEmail,
        inviteRole,
        setInviteRole,
        deploying,
        deployed,
        buildLogs,
        deployError,
        vercelDeploymentUrl,
        vercelLastDeployedAt,
        isShareModalOpen,
        setIsShareModalOpen,
        isDuplicateModalOpen,
        setIsDuplicateModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        hasSavedChanges,
        project,
        profile,
        githubRepoName,
        setGithubRepoName,
        githubIsPrivate,
        setGithubIsPrivate,
        isCreatingRepo,
        isSyncingRepo,
        githubCommitMsg,
        setGithubCommitMsg,
        githubSyncError,
        githubSyncSuccess,
        isLoading,
        isSaving,
        isDuplicating,
        handleConnectGithub,
        handleConnectVercel,
        handleCreateGithubRepo,
        handleSyncGithubRepo,
        handleDeploy,
        handleSaveChanges,
        handleClose,
        handleDuplicateConfirm,
        handleShareConfirm,
        handleDeleteConfirm,
    }
}
