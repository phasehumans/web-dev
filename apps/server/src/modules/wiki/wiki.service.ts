import { prisma } from '@december/database'

import { AppError } from '../../shared/appError'
import { githubAppService } from '../githubapp/githubapp.service'

import { wikiRepository as wikiRepo } from './wiki.repository'
import { slugify } from './wiki.utils'

import type {
    GitHubReposResponse,
    GetUserGitHubRepos,
    GenerateWiki,
    GetWikiByRepo,
    CreateWikiPage,
    UpdateWikiPage,
    DeleteWikiPage,
    ChatWithWiki,
} from './wiki.types'

const getUserGitHubRepos = async (data: GetUserGitHubRepos): Promise<GitHubReposResponse> => {
    const { userId } = data

    const existingWikis = await wikiRepo.findWikisByUser(userId)
    const wikiMap = new Map(existingWikis.map((w) => [w.repoFullName.toLowerCase(), w]))

    try {
        const appRepos = await githubAppService.getUserInstallationRepos({ userId })
        if (appRepos && appRepos.length > 0) {
            const repos = appRepos.map((repo) => {
                const fullName = repo.fullName
                const wiki = wikiMap.get(fullName.toLowerCase())
                return {
                    id: String(repo.id || repo.name),
                    name: repo.name,
                    fullName,
                    owner: repo.owner.login,
                    isPrivate: Boolean(repo.private),
                    description: repo.description || null,
                    status: (wiki?.status || 'IDLE') as any,
                    wikiId: wiki?.id,
                    defaultBranch: repo.defaultBranch || 'main',
                    updatedAt: repo.updatedAt || new Date().toISOString(),
                    isGenerating: wiki?.status === 'GENERATING',
                    hasWiki: Boolean(wiki),
                    wikiStatus: wiki?.status || null,
                    isPinned: wiki?.isPinned ?? false,
                }
            })

            return {
                githubConnected: true,
                repos,
            }
        }
    } catch {
        // Intentionally swallowed: fallback to user token below if app repos failed
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { githubConnected: true, githubToken: true, githubUsername: true },
    })

    const isConnected = Boolean(user?.githubConnected || user?.githubToken || user?.githubUsername)

    if (!user || !isConnected) {
        return {
            githubConnected: false,
            repos: [],
        }
    }

    let fetchedRepos: any[] = []

    try {
        if (user.githubToken) {
            const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
                headers: {
                    Authorization: `token ${user.githubToken}`,
                    'User-Agent': 'December-App',
                    Accept: 'application/vnd.github.v3+json',
                },
                signal: AbortSignal.timeout(1500),
            })
            if (res.ok) {
                const list = await res.json()
                if (Array.isArray(list)) {
                    fetchedRepos = list
                }
            }
        }

        if (fetchedRepos.length === 0 && user.githubUsername) {
            const res = await fetch(
                `https://api.github.com/users/${user.githubUsername}/repos?sort=updated&per_page=100`,
                {
                    headers: {
                        'User-Agent': 'December-App',
                        Accept: 'application/vnd.github.v3+json',
                    },
                    signal: AbortSignal.timeout(1500),
                }
            )
            if (res.ok) {
                const list = await res.json()
                if (Array.isArray(list)) {
                    fetchedRepos = list
                }
            }
        }
    } catch (err) {
        // Intentionally swallowed: return empty fetchedRepos fallback on network timeout or rate limit
    }

    const repos = fetchedRepos.map((repo: any) => {
        const fullName =
            repo.full_name || `${repo.owner?.login || user.githubUsername}/${repo.name}`
        const wiki = wikiMap.get(fullName.toLowerCase())
        return {
            id: String(repo.id || repo.name),
            name: repo.name,
            fullName,
            owner: repo.owner?.login || user.githubUsername || 'user',
            isPrivate: Boolean(repo.private),
            description: repo.description || null,
            defaultBranch: repo.default_branch || 'main',
            updatedAt: repo.updated_at || repo.pushed_at || new Date().toISOString(),
            status: wiki ? wiki.status : ('IDLE' as const),
            isPinned: Boolean(wiki?.isPinned),
            wikiId: wiki?.id,
        }
    })

    return {
        githubConnected: true,
        repos,
    }
}

const generateWiki = async (data: GenerateWiki) => {
    const { userId, repoOwner, repoName } = data
    const repoFullName = `${repoOwner}/${repoName}`
    let wiki = await wikiRepo.upsertRepositoryWiki(userId, repoOwner, repoName, 'GENERATING')

    const defaultPages = [
        {
            title: 'Overview',
            slug: 'overview',
            content: `# Overview\n\nWelcome to the AI-generated documentation for **${repoFullName}**.\n\nThis repository provides core services and components.`,
            order: 1,
        },
        {
            title: 'Architecture',
            slug: 'architecture',
            content: `# Architecture\n\nSystem design and architecture breakdown for **${repoFullName}**.\n\n- Frontend: React / Vite\n- Backend: Express / Bun / Prisma`,
            order: 2,
        },
        {
            title: 'Getting Started',
            slug: 'getting-started',
            content: `# Getting Started\n\nHow to install dependencies and run **${repoFullName}** locally.\n\n\`\`\`bash\nbun install\nbun dev\n\`\`\``,
            order: 3,
        },
    ]

    for (const page of defaultPages) {
        const existing = await wikiRepo.findPageBySlug(wiki.id, page.slug)
        if (!existing) {
            await wikiRepo.createWikiPage({
                wikiId: wiki.id,
                title: page.title,
                slug: page.slug,
                content: page.content,
                order: page.order,
            })
        }
    }

    wiki = (await wikiRepo.updateWikiStatus(wiki.id, 'COMPLETED')) as any
    return wikiRepo.findWikiById(userId, wiki.id)
}

const getWikiByRepo = async (data: GetWikiByRepo) => {
    const { userId, repoOwner, repoName } = data
    const repoFullName = `${repoOwner}/${repoName}`
    const wiki = await wikiRepo.findWikiByRepo(userId, repoFullName)
    if (!wiki) {
        throw new AppError('Wiki not found', 404)
    }
    return wiki
}

const createWikiPage = async (data: CreateWikiPage) => {
    const { userId, dto } = data
    const wiki = await wikiRepo.findWikiById(userId, dto.wikiId)
    if (!wiki) {
        throw new AppError('Unauthorized or wiki not found', 403)
    }

    const slug = dto.slug || slugify(dto.title)
    const existing = await wikiRepo.findPageBySlug(dto.wikiId, slug)
    if (existing) {
        throw new AppError('Page slug already exists in this wiki', 409)
    }

    return wikiRepo.createWikiPage({
        wikiId: dto.wikiId,
        title: dto.title,
        slug,
        content: dto.content,
        order: dto.order ?? wiki.pages.length + 1,
    })
}

const updateWikiPage = async (data: UpdateWikiPage) => {
    const { userId, pageId, dto } = data
    const page = await wikiRepo.findPageById(pageId)
    if (!page || page.wiki.userId !== userId) {
        throw new AppError('Unauthorized or page not found', 404)
    }

    const updates: Partial<{ title: string; slug: string; content: string; order: number }> = {}
    if (dto.title !== undefined) updates.title = dto.title
    if (dto.content !== undefined) updates.content = dto.content
    if (dto.order !== undefined) updates.order = dto.order

    if (dto.slug || (dto.title && dto.title !== page.title)) {
        const newSlug = dto.slug || slugify(dto.title!)
        if (newSlug !== page.slug) {
            const existing = await wikiRepo.findPageBySlug(page.wikiId, newSlug)
            if (existing && existing.id !== pageId) {
                throw new AppError('Page slug already exists in this wiki', 409)
            }
            updates.slug = newSlug
        }
    }

    return wikiRepo.updateWikiPage(pageId, updates)
}

const deleteWikiPage = async (data: DeleteWikiPage) => {
    const { userId, pageId } = data
    const page = await wikiRepo.findPageById(pageId)
    if (!page || page.wiki.userId !== userId) {
        throw new AppError('Unauthorized or page not found', 404)
    }

    return wikiRepo.deleteWikiPage(pageId)
}

const chatWithWiki = async (data: ChatWithWiki) => {
    const { userId, prompt, repoFullName, wikiId } = data
    let wiki = null
    if (wikiId) {
        wiki = await wikiRepo.findWikiById(userId, wikiId)
    } else if (repoFullName) {
        wiki = await wikiRepo.findWikiByRepo(userId, repoFullName)
    }

    const wikiTitle = wiki ? wiki.repoFullName : 'the repository'
    const pagesSummary =
        wiki?.pages.map((p) => `- ${p.title}: ${p.content.slice(0, 100)}...`).join('\n') ||
        'No pages found.'

    return {
        answer: `Based on the repository documentation for **${wikiTitle}**:\n\n${pagesSummary}\n\nIn response to your query "${prompt}": The repository is set up with standard modules and documentation structure.`,
    }
}

const togglePinRepo = async (data: {
    userId: string
    repoOwner: string
    repoName: string
    isPinned?: boolean
}) => {
    const { userId, repoOwner, repoName, isPinned } = data
    return wikiRepo.toggleWikiPin(userId, repoOwner, repoName, isPinned)
}

export const wikiService = {
    getUserGitHubRepos,
    generateWiki,
    getWikiByRepo,
    createWikiPage,
    updateWikiPage,
    deleteWikiPage,
    chatWithWiki,
    togglePinRepo,
}
