export type StoredSessionFile = {
    path: string
    key: string
    contentType?: string
    size: number
}

export type SessionFilters = {
    type?: 'WEB' | 'CLI' | 'SEARCH'
    isArchived?: boolean
    tags?: string[]
    sortBy?: 'updatedAt' | 'createdAt'
    sortOrder?: 'asc' | 'desc'
    search?: string
    page?: number
    limit?: number
}

export type GetUserSessions = {
    userId: string
    filters?: SessionFilters
}

export type CreateSession = {
    userId: string
    title?: string
    projectId?: string | null
    type?: 'WEB' | 'CLI' | 'SEARCH'
    prompt?: string
}

export type GetSession = {
    userId: string
    sessionId: string
}

export type RenameSession = {
    userId: string
    sessionId: string
    title: string
}

export type ArchiveSession = {
    userId: string
    sessionId: string
}

export type UnarchiveSession = {
    userId: string
    sessionId: string
}

export type UpdateSessionTags = {
    userId: string
    sessionId: string
    tags: string[]
}

export type GetSessionInsights = {
    userId: string
    sessionId: string
}

export type DeleteSession = {
    userId: string
    sessionId: string
}

export type GetCollaborators = {
    userId: string
    sessionId: string
}

export type AddCollaborator = {
    userId: string
    sessionId: string
    email: string
}

export type RemoveCollaborator = {
    userId: string
    sessionId: string
    email: string
}

export type DisconnectSession = {
    userId: string
    sessionId: string
}

export type RehydrateSession = {
    userId: string
    sessionId: string
}

export type ProxyPreview = {
    userId: string
    sessionId: string
    port: number
    reqPath?: string
}

export type LoadSessionFiles = {
    sessionId: string
    userId?: string
}
