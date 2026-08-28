export type GitHubAppInstallationPayload = {
    action: string
    installation: {
        id: number | string
        account?: {
            login?: string
            type?: string
        }
        target_type?: string
        permissions?: Record<string, string>
    }
    sender?: {
        id?: number | string
        login?: string
    }
}

export type ProcessInstallation = {
    installationId: string
    userId: string
    accountLogin?: string
    accountType?: string
    targetType?: string
    permissions?: Record<string, string>
}

export type ProcessUninstallation = {
    installationId: string
}

export type VerifySignature = {
    payload: string
    signature: string
}

export type GetInstallationAccessToken = {
    installationId: string
}

export type GetUserInstallationToken = {
    userId: string
    owner?: string
}

export type GetUserInstallationRepos = {
    userId: string
    page?: number
    limit?: number
    search?: string
}

export type GetUserInstallationStatus = {
    userId: string
}

export type GithubInstallationRepo = {
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

export type InstallationStatusResponse = {
    installed: boolean
    installationId: string | null
    accountLogin: string | null
    accountType: string | null
    targetType: string | null
}
