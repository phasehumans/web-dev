import type { CanvasDocument } from '@/features/canvas/types'

import { ApiError, apiFetch, apiRequest } from '@/shared/api/client'

export type BackendSession = {
    id: string
    title: string | null
    type: 'WEB' | 'CLI' | 'SEARCH'
    createdAt: string
    updatedAt: string
    projectId?: string | null
    projectName?: string | null
    lastMessage: string | null
    isPinned?: boolean
    isArchived?: boolean
    tags?: string[]
    prNumber?: number | null
    prState?: 'open' | 'closed' | 'merged' | 'draft' | null
    createdBy?: string | null
    createdByName?: string | null
}

export type BackendSessionVersionSummary = {
    id: string
    versionNumber: number
    label: string
    sourcePrompt: string
    summary: string | null
    status: 'GENERATING' | 'READY' | 'FAILED'
    objectStoragePrefix: string
    fileCount: number
    createdAt: string
    updatedAt: string
}

export type BackendMessage = {
    id: string
    role: 'USER' | 'ASSISTANT' | 'SYSTEM'
    content: string
    blocks?: import('@/features/chat/types').MessageBlock[] | null
    status?: 'thinking' | 'building' | 'done' | 'error' | null
    sequence: number
    createdAt: string
    updatedAt: string
}

export type BackendSessionDetail = {
    project: BackendSession & { name?: string; prompt?: string; status?: string }
    versions: BackendSessionVersionSummary[]
    selectedVersionId: string | null
    activeVersion:
        | (BackendSessionVersionSummary & {
              intent: unknown
              plan: unknown
          })
        | null
    chatMessages: BackendMessage[]
    generatedFiles: Record<string, string>
    canvasState: CanvasDocument
}

export type SessionFilters = {
    type?: 'WEB' | 'CLI' | 'SEARCH'
    isArchived?: boolean
    isPinned?: boolean
    tags?: string[]
    sortBy?: 'updatedAt' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    search?: string
    page?: number
    limit?: number
}

export type PaginatedSessionsResponse = {
    sessions: BackendSession[]
    pagination?: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

export type UpdateGeneralSettingsInput = {
    name?: string
    description?: string | null
    isStarred?: boolean
    isSharedAsTemplate?: boolean
    projectCategory?:
        | 'LANDING_PAGE'
        | 'DASHBOARD'
        | 'PORTFOLIO_BLOG'
        | 'SAAS_APP'
        | 'ECOMMERCE'
        | 'NONE'
}

const buildVersionQuery = (versionId?: string | null) =>
    versionId ? `?versionId=${encodeURIComponent(versionId)}` : ''

export const sessionAPI = {
    getSessions: async (filters?: SessionFilters): Promise<PaginatedSessionsResponse> => {
        const queryParams = new URLSearchParams()
        if (filters?.type) queryParams.append('type', filters.type)
        if (filters?.isArchived !== undefined)
            queryParams.append('isArchived', filters.isArchived.toString())
        if (filters?.isPinned !== undefined)
            queryParams.append('isPinned', filters.isPinned.toString())
        if (filters?.tags && filters.tags.length > 0)
            queryParams.append('tags', filters.tags.join(','))
        if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy)
        if (filters?.sortOrder) queryParams.append('sortOrder', filters.sortOrder)
        if (filters?.search) queryParams.append('search', filters.search)
        if (filters?.page) queryParams.append('page', filters.page.toString())
        if (filters?.limit) queryParams.append('limit', filters.limit.toString())

        const queryString = queryParams.toString()
        const url = `/session${queryString ? `?${queryString}` : ''}`

        const data = await apiRequest<{ sessions: BackendSession[]; pagination?: any }>(url)
        return {
            sessions: data.sessions || [],
            pagination: data.pagination,
        }
    },

    getSession: async (id: string): Promise<BackendSession> => {
        const data = await apiRequest<{ session: BackendSession }>(`/session/${id}`)
        return data.session
    },

    getSessionDetail: (sessionId: string, versionId?: string | null) => {
        return apiRequest<BackendSessionDetail>(
            `/session/${sessionId}${buildVersionQuery(versionId)}`
        )
    },

    createSession: async (data: {
        title?: string
        projectId?: string
        type?: 'WEB' | 'CLI' | 'SEARCH'
        prompt?: string
    }): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>('/session', {
            method: 'POST',
            body: JSON.stringify(data),
        })
        return res.session
    },

    updateSession: async (
        id: string,
        data: { title?: string; projectId?: string }
    ): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        })
        return res.session
    },

    updateSessionSettings: async (
        id: string,
        data: { isPinned?: boolean; isArchived?: boolean; tags?: string[] }
    ): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
        return res.session
    },

    updateGeneralSettings: (sessionId: string, data: UpdateGeneralSettingsInput) => {
        return apiRequest<{ message: string }>(`/session/${sessionId}/general-settings`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    toggleStarSession: (sessionId: string, isStarred: boolean) => {
        return apiRequest<{ message: string }>(`/session/${sessionId}/star`, {
            method: 'POST',
            body: JSON.stringify({ isStarred }),
        })
    },

    duplicateSession: (sessionId: string, name?: string) => {
        return apiRequest<BackendSession>(`/session/${sessionId}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        })
    },

    shareSessionAsTemplate: (
        sessionId: string,
        isSharedAsTemplate: boolean,
        projectCategory?: string
    ) => {
        return apiRequest<{ message: string }>(`/session/${sessionId}/share`, {
            method: 'POST',
            body: JSON.stringify({ isSharedAsTemplate, projectCategory }),
        })
    },

    downloadSession: async (sessionId: string, versionId?: string | null) => {
        const res = await apiFetch(
            `/session/${sessionId}/download${buildVersionQuery(versionId)}`,
            {}
        )

        if (!res.ok) {
            let payload: { message?: string; errors?: unknown } | null

            try {
                payload = await res.json()
            } catch {
                payload = null
            }

            const message =
                (typeof payload?.errors === 'string' && payload.errors) ||
                payload?.message ||
                `Request failed with status ${res.status}`

            throw new ApiError(message, res.status, payload?.errors)
        }

        return {
            blob: await res.blob(),
            fileName:
                res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ??
                `${sessionId}.zip`,
        }
    },

    deployToVercel: (sessionId: string) => {
        return apiRequest<{
            deploymentId: string
            url: string
            readyState: string
        }>(`/platform/sessions/${sessionId}/vercel/deploy`, {
            method: 'POST',
        })
    },

    getVercelDeploymentStatus: (deploymentId: string) => {
        return apiRequest<{
            id: string
            url: string
            readyState: string
        }>(`/platform/deployments/${deploymentId}/status`)
    },

    getCollaborators: (sessionId: string) => {
        return apiRequest<
            {
                id: string
                projectId: string
                userId: string
                email: string
                createdAt: string
                user?: { username: string; name?: string | null }
            }[]
        >(`/session/${sessionId}/collaborators`)
    },

    addCollaborator: (sessionId: string, email: string) => {
        return apiRequest<{
            id: string
            projectId: string
            userId: string
            email: string
            createdAt: string
        }>(`/session/${sessionId}/collaborators`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        })
    },

    removeCollaborator: (sessionId: string, email: string) => {
        return apiRequest<{ message: string }>(
            `/session/${sessionId}/collaborators/${encodeURIComponent(email)}`,
            {
                method: 'DELETE',
            }
        )
    },

    renameSession: async (id: string, title: string): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}/rename`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        })
        return res.session
    },

    archiveSession: async (id: string): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}/archive`, {
            method: 'PATCH',
        })
        return res.session
    },

    unarchiveSession: async (id: string): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}/unarchive`, {
            method: 'PATCH',
        })
        return res.session
    },

    updateSessionTags: async (id: string, tags: string[]): Promise<BackendSession> => {
        const res = await apiRequest<{ session: BackendSession }>(`/session/${id}/tags`, {
            method: 'PUT',
            body: JSON.stringify({ tags }),
        })
        return res.session
    },

    deleteSession: async (id: string): Promise<void> => {
        await apiRequest<void>(`/session/${id}`, {
            method: 'DELETE',
        })
    },

    getSessionInsights: async (id: string): Promise<{ insights: any[] }> => {
        return apiRequest<{ insights: any[] }>(`/session/${id}/insights`)
    },
}

// Backward-compatibility aliases during migration
export type BackendProject = BackendSession & {
    name?: string
    prompt?: string
    isStarred?: boolean
    isSharedAsTemplate?: boolean
    projectStatus?: any
}
export type BackendProjectVersionSummary = BackendSessionVersionSummary
export type BackendProjectDetail = BackendSessionDetail
export const projectAPI = {
    ...sessionAPI,
    getProjects: async () => {
        const res = await sessionAPI.getSessions()
        return res.sessions as unknown as BackendProject[]
    },
    getProject: sessionAPI.getSessionDetail,
    createProject: async (data: { name: string; description?: string; prompt: string }) => {
        return sessionAPI.createSession({
            title: data.name,
            prompt: data.prompt,
        }) as unknown as Promise<BackendProject>
    },
    updateProject: (id: string, data: { rename: string }) =>
        sessionAPI.renameSession(id, data.rename),
    deleteProject: sessionAPI.deleteSession,
    duplicateProject: sessionAPI.duplicateSession,
    shareProjectAsTemplate: sessionAPI.shareSessionAsTemplate,
    toggleStarProject: sessionAPI.toggleStarSession,
    downloadProject: sessionAPI.downloadSession,
}
