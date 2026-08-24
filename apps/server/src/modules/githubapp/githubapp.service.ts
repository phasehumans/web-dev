import crypto from 'crypto'

import { env } from '../../env'
import { AppError } from '../../shared/appError'

import { githubAppRepository } from './githubapp.repository'
import { generateAppJwt } from './githubapp.utils'

import type {
    GetInstallationAccessToken,
    GetUserInstallationRepos,
    GetUserInstallationStatus,
    GetUserInstallationToken,
    GithubInstallationRepo,
    InstallationStatusResponse,
    ProcessInstallation,
    ProcessUninstallation,
    VerifySignature,
} from './githubapp.types'

const processInstallation = async (data: ProcessInstallation) => {
    const { installationId, userId, accountLogin, accountType, targetType, permissions } = data
    return githubAppRepository.upsertInstallation({
        installationId,
        userId,
        accountLogin,
        accountType,
        targetType,
        permissions,
    })
}

const processUninstallation = async (data: ProcessUninstallation) => {
    const { installationId } = data
    return githubAppRepository.deleteInstallation(installationId)
}

const verifySignature = (data: VerifySignature): boolean => {
    const { payload, signature } = data
    const secret = env.GITHUB_APP_WEBHOOK_SECRET || (env.NODE_ENV !== 'production' ? 'secret' : '')
    if (!secret) {
        return false
    }
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expected = `sha256=${hmac.digest('hex')}`
    if (signature.length !== expected.length) {
        return false
    }
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

const getInstallationAccessToken = async (
    data: GetInstallationAccessToken
): Promise<{ token: string; expiresAt: string }> => {
    const { installationId } = data
    const appJwt = generateAppJwt()

    const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${appJwt}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        }
    )

    if (!response.ok) {
        const errorText = await response.text()
        throw new AppError(
            `Failed to create installation access token: ${errorText}`,
            response.status
        )
    }

    const json = (await response.json()) as any
    return {
        token: json.token,
        expiresAt: json.expires_at,
    }
}

const getUserInstallationToken = async (data: GetUserInstallationToken): Promise<string> => {
    const { userId } = data
    const installation = await githubAppRepository.findByUserId(userId)

    if (!installation) {
        throw new AppError('GitHub App is not installed for this account', 400)
    }

    const { token } = await getInstallationAccessToken({
        installationId: installation.installationId,
    })
    return token
}

const getUserInstallationRepos = async (
    data: GetUserInstallationRepos
): Promise<GithubInstallationRepo[]> => {
    const { userId } = data
    const token = await getUserInstallationToken({ userId })

    const response = await fetch('https://api.github.com/installation/repositories?per_page=100', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new AppError(
            `Failed to fetch installation repositories: ${errorText}`,
            response.status
        )
    }

    const json = (await response.json()) as any
    const repositories = json.repositories || []

    return repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        language: repo.language ?? null,
        description: repo.description ?? null,
        owner: {
            login: repo.owner?.login,
            avatarUrl: repo.owner?.avatar_url,
        },
    }))
}

const getUserInstallationStatus = async (
    data: GetUserInstallationStatus
): Promise<InstallationStatusResponse> => {
    const { userId } = data
    const installation = await githubAppRepository.findByUserId(userId)

    if (!installation) {
        return {
            installed: false,
            installationId: null,
            accountLogin: null,
            accountType: null,
            targetType: null,
        }
    }

    return {
        installed: true,
        installationId: installation.installationId,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        targetType: installation.targetType,
    }
}

export const githubAppService = {
    processInstallation,
    processUninstallation,
    verifySignature,
    getInstallationAccessToken,
    getUserInstallationToken,
    getUserInstallationRepos,
    getUserInstallationStatus,
}
