import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import jwt from 'jsonwebtoken'
import request from 'supertest'

import app from '../../src/app'
import { env } from '../../src/env'

describe('Wiki API Endpoints (/api/v1/wiki)', () => {
    let testUserId: string
    let testAuthSessionId: string
    let authToken: string
    const testRepoOwner = 'testowner'
    const testRepoName = 'testrepo'
    let testWikiId: string
    let createdPageId: string

    beforeAll(async () => {
        // Create test user
        const user = await prisma.user.create({
            data: {
                name: 'Wiki Test User',
                email: `wiki-test-${Date.now()}@example.com`,
                username: `wikitest${Date.now()}`,
                githubConnected: false,
            },
        })
        testUserId = user.id

        // Create auth session
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `hash-${Date.now()}`,
                expiresAt,
            },
        })
        testAuthSessionId = session.id

        // Generate JWT access token
        authToken = jwt.sign(
            { userId: testUserId, sessionId: testAuthSessionId },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        )
    })

    afterAll(async () => {
        // Cleanup test data
        if (testUserId) {
            await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
        }
    })

    it('GET /api/v1/wiki/github-repos - unconnected state', async () => {
        const res = await request(app)
            .get('/api/v1/wiki/github-repos')
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.githubConnected).toBe(false)
        expect(res.body.data.repos).toEqual([])
    })

    it('GET /api/v1/wiki/github-repos - connected state', async () => {
        // Connect user github
        await prisma.user.update({
            where: { id: testUserId },
            data: { githubConnected: true, githubUsername: 'wiki-tester' },
        })

        const res = await request(app)
            .get('/api/v1/wiki/github-repos')
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.githubConnected).toBe(true)
        expect(Array.isArray(res.body.data.repos)).toBe(true)
    })

    it('POST /api/v1/wiki/generate - generates default pages for repository', async () => {
        const res = await request(app)
            .post('/api/v1/wiki/generate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                repoOwner: testRepoOwner,
                repoName: testRepoName,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.wiki).toBeDefined()
        expect(res.body.data.wiki.status).toBe('COMPLETED')
        expect(res.body.data.wiki.repoFullName).toBe(`${testRepoOwner}/${testRepoName}`)
        expect(res.body.data.wiki.pages.length).toBe(3)

        testWikiId = res.body.data.wiki.id
    })

    it('GET /api/v1/wiki/repos/:owner/:repo - retrieves wiki metadata and page tree', async () => {
        const res = await request(app)
            .get(`/api/v1/wiki/repos/${testRepoOwner}/${testRepoName}`)
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.wiki).toBeDefined()
        expect(res.body.data.wiki.id).toBe(testWikiId)
        expect(res.body.data.wiki.pages.map((p: any) => p.slug)).toContain('overview')
    })

    it('POST /api/v1/wiki/pages - creates custom wiki page', async () => {
        const res = await request(app)
            .post('/api/v1/wiki/pages')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                wikiId: testWikiId,
                title: 'Custom API Spec',
                content: '# Custom API Spec\n\nDetailed REST API endpoint contracts.',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.page).toBeDefined()
        expect(res.body.data.page.title).toBe('Custom API Spec')
        expect(res.body.data.page.slug).toBe('custom-api-spec')

        createdPageId = res.body.data.page.id
    })

    it('POST /api/v1/wiki/pages - handles duplicate slug conflict with 409', async () => {
        const res = await request(app)
            .post('/api/v1/wiki/pages')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                wikiId: testWikiId,
                title: 'Custom API Spec',
                content: 'Duplicate content',
            })

        expect(res.status).toBe(409)
        expect(res.body.message.toLowerCase()).toBe('page slug already exists in this wiki')
    })

    it('PUT /api/v1/wiki/pages/:id - updates wiki page', async () => {
        const res = await request(app)
            .put(`/api/v1/wiki/pages/${createdPageId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Updated API Spec',
                content: '# Updated API Spec Content',
            })

        expect(res.status).toBe(200)
        expect(res.body.data.page).toBeDefined()
        expect(res.body.data.page.title).toBe('Updated API Spec')
        expect(res.body.data.page.content).toBe('# Updated API Spec Content')
    })

    it('POST /api/v1/wiki/chat - responds to user query grounded in wiki', async () => {
        const res = await request(app)
            .post('/api/v1/wiki/chat')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                wikiId: testWikiId,
                prompt: 'How do I run the application?',
            })

        expect(res.status).toBe(200)
        expect(res.body.data.answer).toBeDefined()
        expect(typeof res.body.data.answer).toBe('string')
    })

    it('DELETE /api/v1/wiki/pages/:id - deletes wiki page', async () => {
        const res = await request(app)
            .delete(`/api/v1/wiki/pages/${createdPageId}`)
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
    })
})
