import { AppError } from '../../shared/appError'
import {
    getBinaryFile,
    getTextFile,
    listPrefix,
    sessionWorkspacePrefix,
} from '../../shared/project-storage'
import { githubAppService } from '../githubapp/githubapp.service'

import { platformRepository } from './platform.repository'
import { buildProjectZip } from './platform.utils'
import { vercelService } from './vercel.service'

import type {
    ListGithubRepos,
    GithubRepo,
    CreateRepo,
    UpdateRepo,
    DownloadSession,
    DeployVercelDirect,
    DeployVercelProject,
} from './platform.types'

const resolveUserGithubToken = async (userId: string, owner?: string): Promise<string> => {
    try {
        const token = await githubAppService.getUserInstallationToken({ userId, owner })
        if (token) {
            return token
        }
    } catch {
        // Intentionally swallowed: fallback to legacy user.githubToken below
    }

    const user = await platformRepository.findUserGithubConnection(userId)
    if (user?.githubToken) {
        return user.githubToken
    }

    throw new AppError('GitHub is not connected. Please connect the December GitHub App.', 400)
}

const downloadSession = async (data: DownloadSession) => {
    const { sessionId, userId } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })
    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const prefix = sessionWorkspacePrefix(sessionId)
    const objects = await listPrefix(prefix)
    const filesToZip: { path: string; content: string }[] = []

    await Promise.all(
        objects.map(async (obj) => {
            const key = obj.Key
            if (!key) return
            const relativePath = key.substring(prefix.length)
            if (!relativePath || relativePath.endsWith('/')) return

            const isBinary =
                relativePath.endsWith('.png') ||
                relativePath.endsWith('.jpg') ||
                relativePath.endsWith('.jpeg') ||
                relativePath.endsWith('.webp') ||
                relativePath.endsWith('.gif') ||
                relativePath.endsWith('.ico') ||
                relativePath.endsWith('.zip') ||
                relativePath.endsWith('.pdf')

            if (isBinary) {
                const bin = await getBinaryFile(key)
                if (bin) {
                    filesToZip.push({ path: relativePath, content: '' })
                }
            } else {
                const text = await getTextFile(key)
                filesToZip.push({ path: relativePath, content: text || '' })
            }
        })
    )

    const zip = buildProjectZip(filesToZip)
    const safeSessionName =
        (session.title || 'session')
            .trim()
            .replace(/[^a-z0-9-_]+/gi, '-')
            .replace(/^-+|-+$/g, '') || 'session'
    const fileName = `${safeSessionName}.zip`

    return {
        fileName,
        zip,
    }
}

const getUserGithubRepos = async (data: ListGithubRepos): Promise<GithubRepo[]> => {
    const { userId, page: requestedPage, limit: requestedLimit, search } = data

    try {
        const appRepos = await githubAppService.getUserInstallationRepos({
            userId,
            page: requestedPage,
            limit: requestedLimit,
            search,
        })
        if (appRepos && appRepos.length > 0) {
            return appRepos
        }
    } catch {
        // Intentionally swallowed: fallback to user token below if app repos not found
    }

    const user = await platformRepository.findUserGithubConnection(userId)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    if (user.githubConnected === false && !user.githubAppInstall) {
        throw new AppError('github is not connected', 401)
    }

    if (!user.githubToken) {
        return []
    }

    let repos: any[] = []
    let page = requestedPage || 1
    const perPage = requestedLimit ? Math.min(requestedLimit, 100) : 100
    let hasMore = true

    while (hasMore) {
        const response = await fetch(
            `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${user.githubToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            throw new AppError(`Failed to fetch GitHub repos: ${errorText}`, 401)
        }

        const pageRepos = (await response.json()) as any[]
        const filtered = search
            ? pageRepos.filter(
                  (r) =>
                      r.name?.toLowerCase().includes(search.toLowerCase()) ||
                      r.full_name?.toLowerCase().includes(search.toLowerCase())
              )
            : pageRepos

        repos = repos.concat(filtered)

        if (pageRepos.length < perPage || requestedPage !== undefined) {
            hasMore = false
        } else {
            page++
        }
    }

    return repos.map((repo: any) => ({
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

const createRepo = async (data: CreateRepo) => {
    const { userId, sessionId } = data
    const githubToken = await resolveUserGithubToken(userId)

    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })

    if (!session) {
        throw new AppError('Session not found', 404)
    }

    const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: data.name,
            private: data.private,
            description:
                data.description ?? `Generated by December: ${session.title || 'Untitled'}`,
            auto_init: true,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new AppError(`GitHub repository creation failed: ${errorText}`, response.status)
    }

    const repoData = (await response.json()) as any
    const repoName = repoData.name
    const repoOwner = repoData.owner.login
    const repoUrl = repoData.html_url

    const updatedSession = await platformRepository.updateSessionGithub({
        sessionId,
        githubRepoName: repoName,
        githubRepoOwner: repoOwner,
        githubRepoUrl: repoUrl,
    })

    try {
        await updateRepo({ userId, sessionId, commitMessage: 'Initial sync from December' })
    } catch (syncError) {
        console.error('Initial sync failed:', syncError)
    }

    return updatedSession
}

const updateRepo = async (data: UpdateRepo) => {
    const { userId, sessionId } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })

    if (!session) {
        throw new AppError('Session not found', 404)
    }

    if (!session.githubRepoName || !session.githubRepoOwner) {
        throw new AppError('Session is not linked to any GitHub repository', 400)
    }

    const repoOwner = session.githubRepoOwner
    const repoName = session.githubRepoName
    const githubToken = await resolveUserGithubToken(userId, repoOwner)
    const commitMessage = data.commitMessage ?? 'Update session files'

    const prefix = sessionWorkspacePrefix(sessionId)
    const objects = await listPrefix(prefix)
    if (objects.length === 0) {
        throw new AppError('No files found in active session workspace to sync', 400)
    }

    const headers = {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
        method: 'GET',
        headers,
    })

    if (!repoResponse.ok) {
        const errorText = await repoResponse.text()
        throw new AppError(
            `Failed to fetch GitHub repository details: ${errorText}`,
            repoResponse.status
        )
    }

    const repoDetails = (await repoResponse.json()) as any
    const defaultBranch = repoDetails.default_branch || 'main'

    const refResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${defaultBranch}`,
        {
            method: 'GET',
            headers,
        }
    )

    if (!refResponse.ok) {
        const errorText = await refResponse.text()
        throw new AppError(
            `Failed to fetch default branch reference: ${errorText}`,
            refResponse.status
        )
    }

    const refData = (await refResponse.json()) as any
    const latestCommitSha = refData.object.sha

    const commitResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits/${latestCommitSha}`,
        {
            method: 'GET',
            headers,
        }
    )

    if (!commitResponse.ok) {
        const errorText = await commitResponse.text()
        throw new AppError(
            `Failed to fetch base commit details: ${errorText}`,
            commitResponse.status
        )
    }

    const commitData = (await commitResponse.json()) as any
    const baseTreeSha = commitData.tree.sha

    const treeEntries: any[] = []

    const chunkSize = 5
    for (let i = 0; i < objects.length; i += chunkSize) {
        const chunk = objects.slice(i, i + chunkSize)

        await Promise.all(
            chunk.map(async (file) => {
                const key = file.Key
                if (!key) return
                const relativePath = key.substring(prefix.length)
                if (!relativePath || relativePath.endsWith('/')) return

                const isBinary =
                    relativePath.endsWith('.png') ||
                    relativePath.endsWith('.jpg') ||
                    relativePath.endsWith('.jpeg') ||
                    relativePath.endsWith('.webp') ||
                    relativePath.endsWith('.gif') ||
                    relativePath.endsWith('.ico') ||
                    relativePath.endsWith('.zip') ||
                    relativePath.endsWith('.pdf')

                if (isBinary) {
                    const binaryFile = await getBinaryFile(key)
                    if (binaryFile) {
                        const base64Content = Buffer.from(binaryFile.body).toString('base64')
                        const blobResponse = await fetch(
                            `https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs`,
                            {
                                method: 'POST',
                                headers,
                                body: JSON.stringify({
                                    content: base64Content,
                                    encoding: 'base64',
                                }),
                            }
                        )

                        if (!blobResponse.ok) {
                            const errorText = await blobResponse.text()
                            throw new AppError(
                                `Failed to create binary blob for ${relativePath}: ${errorText}`,
                                blobResponse.status
                            )
                        }

                        const blobData = (await blobResponse.json()) as any
                        treeEntries.push({
                            path: relativePath,
                            mode: '100644',
                            type: 'blob',
                            sha: blobData.sha,
                        })
                    }
                } else {
                    const textContent = await getTextFile(key)
                    treeEntries.push({
                        path: relativePath,
                        mode: '100644',
                        type: 'blob',
                        content: textContent ?? '',
                    })
                }
            })
        )
    }

    const treeResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeEntries,
            }),
        }
    )

    if (!treeResponse.ok) {
        const errorText = await treeResponse.text()
        throw new AppError(`Failed to create new Git tree: ${errorText}`, treeResponse.status)
    }

    const treeData = (await treeResponse.json()) as any
    const newTreeSha = treeData.sha

    const newCommitResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: commitMessage,
                tree: newTreeSha,
                parents: [latestCommitSha],
            }),
        }
    )

    if (!newCommitResponse.ok) {
        const errorText = await newCommitResponse.text()
        throw new AppError(`Failed to create Git commit: ${errorText}`, newCommitResponse.status)
    }

    const newCommitData = (await newCommitResponse.json()) as any
    const newCommitSha = newCommitData.sha

    const updateRefResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${defaultBranch}`,
        {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sha: newCommitSha,
                force: true,
            }),
        }
    )

    if (!updateRefResponse.ok) {
        const errorText = await updateRefResponse.text()
        throw new AppError(
            `Failed to update default branch reference: ${errorText}`,
            updateRefResponse.status
        )
    }

    const updatedSession = await platformRepository.updateSessionSynced(sessionId)

    return {
        session: updatedSession,
        commitSha: newCommitSha,
    }
}

const unlinkGithubRepo = async (data: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })
    if (!session) throw new AppError('Session not found', 404)

    await platformRepository.unlinkSessionGithub(sessionId)
    return { message: 'GitHub repository unlinked successfully' }
}

const unlinkVercelProject = async (data: { sessionId: string; userId: string }) => {
    const { sessionId, userId } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })
    if (!session) throw new AppError('Session not found', 404)

    await platformRepository.unlinkSessionVercel(sessionId)
    return { message: 'Vercel project unlinked successfully' }
}

const syncEnvironmentVariables = async (data: {
    sessionId: string
    userId: string
    keys?: string[]
}) => {
    const { sessionId, userId, keys } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })
    if (!session) throw new AppError('Session not found', 404)

    if (!session.vercelProjectId) {
        throw new AppError('Session is not linked to a Vercel project', 400)
    }

    const memories = await platformRepository.getSessionMemories(sessionId)

    const memoriesToSync = keys ? memories.filter((m) => keys.includes(m.key)) : memories

    if (memoriesToSync.length === 0) {
        return { message: 'No environment variables to sync' }
    }

    const envVars = memoriesToSync.map((m) => ({
        key: m.key,
        value: m.value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
    }))

    await vercelService.addEnvVars({
        userId,
        vercelProjectId: session.vercelProjectId,
        envVars,
    })

    return { message: 'Environment variables synced successfully' }
}

const deployVercelDirect = async (data: DeployVercelDirect) => {
    const { userId, sessionId, vercelProjectId, vercelProjectName } = data

    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })
    if (!session) throw new AppError('Session not found', 404)

    const prefix = sessionWorkspacePrefix(sessionId)
    const objects = await listPrefix(prefix)
    if (objects.length === 0)
        throw new AppError('No files found in active session workspace to deploy', 400)

    const filesToDeploy: { file: string; data: string; encoding?: string }[] = []

    for (const file of objects) {
        const key = file.Key
        if (!key) return
        const relativePath = key.substring(prefix.length)
        if (!relativePath || relativePath.endsWith('/')) return

        const isBinary =
            relativePath.endsWith('.png') ||
            relativePath.endsWith('.jpg') ||
            relativePath.endsWith('.jpeg') ||
            relativePath.endsWith('.webp') ||
            relativePath.endsWith('.gif') ||
            relativePath.endsWith('.ico') ||
            relativePath.endsWith('.zip') ||
            relativePath.endsWith('.pdf')

        if (isBinary) {
            const binaryFile = await getBinaryFile(key)
            if (binaryFile) {
                const base64Content = Buffer.from(binaryFile.body).toString('base64')
                filesToDeploy.push({
                    file: relativePath,
                    data: base64Content,
                    encoding: 'base64',
                })
            }
        } else {
            const textContent = await getTextFile(key)
            filesToDeploy.push({
                file: relativePath,
                data: textContent ?? '',
            })
        }
    }

    const deployment = await vercelService.createDirectDeployment({
        userId,
        vercelProjectId,
        name: vercelProjectName,
        files: filesToDeploy,
    })

    await platformRepository.updateSessionVercelDeployment({
        sessionId,
        url: deployment.url,
    })

    return deployment
}

const deployVercelProject = async (data: DeployVercelProject) => {
    const { userId, sessionId } = data
    const session = await platformRepository.findSessionByIdAndUser({ sessionId, userId })

    if (!session || session.userId !== userId) {
        throw new AppError('session not found', 404)
    }

    let vercelProjectId = session.vercelProjectId
    let vercelProjectName = session.vercelProjectName

    const isGithubLinked = !!(session.githubRepoOwner && session.githubRepoName)

    if (!vercelProjectId) {
        const sanitizedName = (session.title || 'session')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')

        const vercelProject = await vercelService.createProject({
            userId,
            name: sanitizedName,
            repoOwner: session.githubRepoOwner || undefined,
            repoName: session.githubRepoName || undefined,
        })
        vercelProjectId = vercelProject.id
        vercelProjectName = vercelProject.name

        await platformRepository.updateSessionVercelLink({
            sessionId,
            vercelProjectId: vercelProject.id,
            vercelProjectName: vercelProject.name,
        })
    }

    if (isGithubLinked) {
        const { commitSha } = await updateRepo({
            userId,
            sessionId,
            commitMessage: 'Auto-deploy triggered from December settings',
        })

        const deployment = await vercelService.getDeploymentByCommit({
            userId,
            vercelProjectId: vercelProjectId!,
            commitSha,
        })

        await platformRepository.updateSessionVercelDeployment({
            sessionId,
            url: deployment.url,
        })

        return {
            message: 'auto-deployment triggered on vercel successfully',
            deploymentId: deployment.id,
            url: deployment.url,
            readyState: deployment.readyState,
        }
    } else {
        const deployment = await deployVercelDirect({
            userId,
            sessionId,
            vercelProjectId: vercelProjectId!,
            vercelProjectName: vercelProjectName!,
        })

        return {
            message: 'direct deployment triggered on vercel successfully',
            deploymentId: deployment.id,
            url: deployment.url,
            readyState: deployment.readyState,
        }
    }
}

export const platformService = {
    downloadSession,
    getUserGithubRepos,
    createRepo,
    updateRepo,
    unlinkGithubRepo,
    unlinkVercelProject,
    syncEnvironmentVariables,
    deployVercelDirect,
    deployVercelProject,
}
