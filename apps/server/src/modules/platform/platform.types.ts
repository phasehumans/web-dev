import type { Response } from 'express'

export type DeploySession = {
    sessionId: string
    userId: string
}

export type DownloadSession = {
    sessionId: string
    userId: string
}

export type DeployVercelDirect = {
    userId: string
    sessionId: string
    vercelProjectId: string
    vercelProjectName: string
}

export type DeployVercelProject = {
    userId: string
    sessionId: string
}

export type CreateVercelProject = {
    userId: string
    name: string
    repoOwner?: string
    repoName?: string
}

export type GetDeploymentByCommit = {
    userId: string
    vercelProjectId: string
    commitSha: string
}

export type GetLatestDeployment = {
    userId: string
    vercelProjectId: string
}

export type GetDeploymentStatus = {
    userId: string
    deploymentId: string
}

export type StreamBuildLogs = {
    userId: string
    deploymentId: string
    res: Response
}

export type ListGithubRepos = {
    userId: string
    page?: number
    limit?: number
    search?: string
}

export type GithubRepo = {
    id: number
    name: string
    fullName: string
    private: boolean
    defaultBranch: string
    updatedAt: string
    htmlUrl: string
    cloneUrl: string
    language: string | null
    description: string | null
    owner: {
        login: string
        avatarUrl: string
    }
}

export type CreateRepo = {
    userId: string
    sessionId: string
    name: string
    private: boolean
    description?: string
}

export type UpdateRepo = {
    userId: string
    sessionId: string
    commitMessage?: string
}

export type UnlinkSession = {
    userId: string
    sessionId: string
}

export type SyncEnvVars = {
    userId: string
    sessionId: string
    keys?: string[]
}

export type CancelDeployment = {
    userId: string
    deploymentId: string
}
