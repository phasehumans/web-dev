import { prisma } from '@december/database'
import { describe, it, expect } from 'bun:test'

import { wikiRepository } from '../../src/modules/wiki/wiki.repository'
import { wikiService } from '../../src/modules/wiki/wiki.service'
import { AppError } from '../../src/shared/appError'

describe('Wiki Service - Unit Tests', () => {
    describe('getUserGitHubRepos', () => {
        it('should return githubConnected: false if user has no github token or connection', async () => {
            const originalFindUnique = prisma.user.findUnique
            prisma.user.findUnique = (async () => ({
                githubConnected: false,
                githubToken: null,
                githubUsername: null,
            })) as any

            try {
                const res = await wikiService.getUserGitHubRepos({ userId: 'u1' })
                expect(res).toEqual({
                    githubConnected: false,
                    repos: [],
                })
            } finally {
                prisma.user.findUnique = originalFindUnique
            }
        })

        it('should return repositories and match existing wiki status when user has github info', async () => {
            const originalFindUnique = prisma.user.findUnique
            const originalFindWikis = wikiRepository.findWikisByUser

            prisma.user.findUnique = (async () => ({
                githubConnected: true,
                githubToken: null,
                githubUsername: 'testdev',
            })) as any

            wikiRepository.findWikisByUser = (async () => [
                {
                    id: 'wiki-1',
                    repoFullName: 'testdev/my-repo',
                    status: 'COMPLETED',
                    isPinned: true,
                },
            ]) as any

            // Mock global fetch for GitHub API
            const originalFetch = globalThis.fetch
            globalThis.fetch = (async (url: string) => {
                if (url.includes('api.github.com/users/testdev/repos')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 101,
                                name: 'my-repo',
                                full_name: 'testdev/my-repo',
                                private: false,
                                description: 'A test repo',
                                default_branch: 'main',
                                updated_at: '2026-01-01T00:00:00Z',
                            },
                        ],
                    }
                }
                return { ok: false }
            }) as any

            try {
                const res = await wikiService.getUserGitHubRepos({ userId: 'u1' })
                expect(res.githubConnected).toBe(true)
                expect(res.repos.length).toBe(1)
                expect(res.repos[0].name).toBe('my-repo')
                expect(res.repos[0].fullName).toBe('testdev/my-repo')
                expect(res.repos[0].status).toBe('COMPLETED')
                expect(res.repos[0].isPinned).toBe(true)
                expect(res.repos[0].wikiId).toBe('wiki-1')
            } finally {
                prisma.user.findUnique = originalFindUnique
                wikiRepository.findWikisByUser = originalFindWikis
                globalThis.fetch = originalFetch
            }
        })
    })

    describe('generateWiki', () => {
        it('should upsert wiki and create default pages if missing, then mark completed', async () => {
            const originalUpsert = wikiRepository.upsertRepositoryWiki
            const originalFindSlug = wikiRepository.findPageBySlug
            const originalCreatePage = wikiRepository.createWikiPage
            const originalUpdateStatus = wikiRepository.updateWikiStatus
            const originalFindById = wikiRepository.findWikiById

            const createdPages: any[] = []
            wikiRepository.upsertRepositoryWiki = (async (userId, owner, name, status) => ({
                id: 'wiki-generated-1',
                userId,
                repoOwner: owner,
                repoName: name,
                repoFullName: `${owner}/${name}`,
                status,
            })) as any

            wikiRepository.findPageBySlug = (async () => null) as any
            wikiRepository.createWikiPage = (async (data) => {
                createdPages.push(data)
                return { id: `page-${createdPages.length}`, ...data }
            }) as any
            wikiRepository.updateWikiStatus = (async (id, status) => ({ id, status })) as any
            wikiRepository.findWikiById = (async (_userId, id) => ({
                id,
                repoFullName: 'owner/test-app',
                status: 'COMPLETED',
                pages: createdPages,
            })) as any

            try {
                const res = await wikiService.generateWiki({
                    userId: 'u1',
                    repoOwner: 'owner',
                    repoName: 'test-app',
                })

                expect(res).not.toBeNull()
                expect(res?.status).toBe('COMPLETED')
                expect(createdPages.length).toBe(3)
                const pageSlugs = createdPages.map((p) => p.slug)
                expect(pageSlugs).toContain('overview')
                expect(pageSlugs).toContain('architecture')
                expect(pageSlugs).toContain('getting-started')
            } finally {
                wikiRepository.upsertRepositoryWiki = originalUpsert
                wikiRepository.findPageBySlug = originalFindSlug
                wikiRepository.createWikiPage = originalCreatePage
                wikiRepository.updateWikiStatus = originalUpdateStatus
                wikiRepository.findWikiById = originalFindById
            }
        })
    })

    describe('getWikiByRepo', () => {
        it('should throw AppError 404 if wiki not found', async () => {
            const originalFind = wikiRepository.findWikiByRepo
            wikiRepository.findWikiByRepo = (async () => null) as any

            try {
                await expect(
                    wikiService.getWikiByRepo({
                        userId: 'u1',
                        repoOwner: 'owner',
                        repoName: 'missing',
                    })
                ).rejects.toThrow(new AppError('Wiki not found', 404))
            } finally {
                wikiRepository.findWikiByRepo = originalFind
            }
        })

        it('should return wiki if found', async () => {
            const originalFind = wikiRepository.findWikiByRepo
            const mockWiki = { id: 'w1', repoFullName: 'owner/found' }
            wikiRepository.findWikiByRepo = (async () => mockWiki) as any

            try {
                const res = await wikiService.getWikiByRepo({
                    userId: 'u1',
                    repoOwner: 'owner',
                    repoName: 'found',
                })
                expect(res).toEqual(mockWiki as any)
            } finally {
                wikiRepository.findWikiByRepo = originalFind
            }
        })
    })

    describe('createWikiPage', () => {
        it('should throw AppError 403 if wiki not found or unauthorized', async () => {
            const originalFind = wikiRepository.findWikiById
            wikiRepository.findWikiById = (async () => null) as any

            try {
                await expect(
                    wikiService.createWikiPage({
                        userId: 'u1',
                        dto: {
                            wikiId: '123e4567-e89b-12d3-a456-426614174000',
                            title: 'New Page',
                            content: 'Page content',
                        },
                    })
                ).rejects.toThrow(new AppError('Unauthorized or wiki not found', 403))
            } finally {
                wikiRepository.findWikiById = originalFind
            }
        })

        it('should throw AppError 409 if page slug already exists', async () => {
            const originalFind = wikiRepository.findWikiById
            const originalFindSlug = wikiRepository.findPageBySlug

            wikiRepository.findWikiById = (async () => ({
                id: 'wiki-1',
                pages: [],
            })) as any
            wikiRepository.findPageBySlug = (async () => ({
                id: 'existing-page',
                slug: 'duplicate-page',
            })) as any

            try {
                await expect(
                    wikiService.createWikiPage({
                        userId: 'u1',
                        dto: {
                            wikiId: 'wiki-1',
                            title: 'Duplicate Page',
                            slug: 'duplicate-page',
                            content: 'content',
                        },
                    })
                ).rejects.toThrow(new AppError('Page slug already exists in this wiki', 409))
            } finally {
                wikiRepository.findWikiById = originalFind
                wikiRepository.findPageBySlug = originalFindSlug
            }
        })

        it('should create wiki page successfully when valid', async () => {
            const originalFind = wikiRepository.findWikiById
            const originalFindSlug = wikiRepository.findPageBySlug
            const originalCreate = wikiRepository.createWikiPage

            wikiRepository.findWikiById = (async () => ({
                id: 'wiki-1',
                pages: [{ id: 'p1' }],
            })) as any
            wikiRepository.findPageBySlug = (async () => null) as any
            wikiRepository.createWikiPage = (async (data) => ({
                id: 'new-page-id',
                ...data,
            })) as any

            try {
                const res = await wikiService.createWikiPage({
                    userId: 'u1',
                    dto: {
                        wikiId: 'wiki-1',
                        title: 'Installation Guide',
                        content: '# Install\nStep 1',
                    },
                })
                expect(res.id).toBe('new-page-id')
                expect(res.slug).toBe('installation-guide')
                expect(res.order).toBe(2)
            } finally {
                wikiRepository.findWikiById = originalFind
                wikiRepository.findPageBySlug = originalFindSlug
                wikiRepository.createWikiPage = originalCreate
            }
        })
    })

    describe('updateWikiPage', () => {
        it('should throw AppError 404 if page does not exist or user is not owner', async () => {
            const originalFindPage = wikiRepository.findPageById
            wikiRepository.findPageById = (async () => null) as any

            try {
                await expect(
                    wikiService.updateWikiPage({
                        userId: 'u1',
                        pageId: 'p1',
                        dto: { title: 'New' },
                    })
                ).rejects.toThrow(new AppError('Unauthorized or page not found', 404))
            } finally {
                wikiRepository.findPageById = originalFindPage
            }
        })

        it('should throw AppError 409 if new slug collides with different page', async () => {
            const originalFindPage = wikiRepository.findPageById
            const originalFindSlug = wikiRepository.findPageBySlug

            wikiRepository.findPageById = (async () => ({
                id: 'p1',
                wikiId: 'wiki-1',
                title: 'Old Title',
                slug: 'old-title',
                wiki: { userId: 'u1' },
            })) as any
            wikiRepository.findPageBySlug = (async () => ({
                id: 'p2',
                slug: 'colliding-slug',
            })) as any

            try {
                await expect(
                    wikiService.updateWikiPage({
                        userId: 'u1',
                        pageId: 'p1',
                        dto: { slug: 'colliding-slug' },
                    })
                ).rejects.toThrow(new AppError('Page slug already exists in this wiki', 409))
            } finally {
                wikiRepository.findPageById = originalFindPage
                wikiRepository.findPageBySlug = originalFindSlug
            }
        })

        it('should update wiki page fields on success', async () => {
            const originalFindPage = wikiRepository.findPageById
            const originalUpdate = wikiRepository.updateWikiPage

            wikiRepository.findPageById = (async () => ({
                id: 'p1',
                wikiId: 'wiki-1',
                title: 'Old',
                slug: 'old',
                wiki: { userId: 'u1' },
            })) as any
            wikiRepository.updateWikiPage = (async (pageId, updates) => ({
                id: pageId,
                ...updates,
            })) as any

            try {
                const res = await wikiService.updateWikiPage({
                    userId: 'u1',
                    pageId: 'p1',
                    dto: { title: 'Updated Title', content: 'Updated content' },
                })
                expect(res.id).toBe('p1')
                expect(res.title).toBe('Updated Title')
                expect(res.content).toBe('Updated content')
            } finally {
                wikiRepository.findPageById = originalFindPage
                wikiRepository.updateWikiPage = originalUpdate
            }
        })
    })

    describe('deleteWikiPage', () => {
        it('should throw AppError 404 if page not found or unauthorized', async () => {
            const originalFindPage = wikiRepository.findPageById
            wikiRepository.findPageById = (async () => null) as any

            try {
                await expect(
                    wikiService.deleteWikiPage({
                        userId: 'u1',
                        pageId: 'missing-p',
                    })
                ).rejects.toThrow(new AppError('Unauthorized or page not found', 404))
            } finally {
                wikiRepository.findPageById = originalFindPage
            }
        })

        it('should delete page when user is owner', async () => {
            const originalFindPage = wikiRepository.findPageById
            const originalDelete = wikiRepository.deleteWikiPage

            wikiRepository.findPageById = (async () => ({
                id: 'p1',
                wiki: { userId: 'u1' },
            })) as any
            wikiRepository.deleteWikiPage = (async (pageId) => ({ id: pageId })) as any

            try {
                const res = await wikiService.deleteWikiPage({
                    userId: 'u1',
                    pageId: 'p1',
                })
                expect(res).toEqual({ id: 'p1' } as any)
            } finally {
                wikiRepository.findPageById = originalFindPage
                wikiRepository.deleteWikiPage = originalDelete
            }
        })
    })

    describe('chatWithWiki and togglePinRepo', () => {
        it('chatWithWiki should return generated answer', async () => {
            const originalFindWiki = wikiRepository.findWikiById
            wikiRepository.findWikiById = (async () => ({
                id: 'w1',
                repoFullName: 'owner/my-app',
                pages: [{ title: 'Overview', content: 'Main entry point' }],
            })) as any

            try {
                const res = await wikiService.chatWithWiki({
                    userId: 'u1',
                    wikiId: 'w1',
                    prompt: 'What is this app?',
                })
                expect(res.answer).toContain('owner/my-app')
                expect(res.answer).toContain('Overview')
            } finally {
                wikiRepository.findWikiById = originalFindWiki
            }
        })

        it('togglePinRepo should call toggleWikiPin', async () => {
            const originalPin = wikiRepository.toggleWikiPin
            wikiRepository.toggleWikiPin = (async (userId, owner, name, isPinned) => ({
                userId,
                repoOwner: owner,
                repoName: name,
                isPinned: isPinned ?? true,
            })) as any

            try {
                const res = await wikiService.togglePinRepo({
                    userId: 'u1',
                    repoOwner: 'owner',
                    repoName: 'my-app',
                    isPinned: true,
                })
                expect(res.isPinned).toBe(true)
            } finally {
                wikiRepository.toggleWikiPin = originalPin
            }
        })
    })
})
