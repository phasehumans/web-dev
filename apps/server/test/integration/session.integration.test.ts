import { prisma } from '@december/database'
import { describe, it, expect, afterAll, beforeAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Session Integration Tests', () => {
    const user1Email = `sessiontest1-${Date.now()}@example.com`
    const user2Email = `sessiontest2-${Date.now()}@example.com`
    const password = 'Password123!'

    let user1Id: string
    let user2Id: string
    let user1Token: string
    let user2Token: string
    let createdSessionId: string

    beforeAll(async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)

        const timestamp = Date.now()
        // Create User 1
        const u1 = await prisma.user.create({
            data: {
                email: user1Email,
                name: 'Session Test User 1',
                username: `sessuserone_${timestamp}`,
                password: passHash,
                emailVerified: true,
                creditBalance: 5000,
            },
        })
        user1Id = u1.id

        // Create User 2
        const u2 = await prisma.user.create({
            data: {
                email: user2Email,
                name: 'Session Test User 2',
                username: `sessusertwo_${timestamp}`,
                password: passHash,
                emailVerified: true,
                creditBalance: 5000,
            },
        })
        user2Id = u2.id

        // Login User 1
        const loginRes1 = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: user1Email, password })
        user1Token = loginRes1.body.data.accessToken

        // Login User 2
        const loginRes2 = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: user2Email, password })
        user2Token = loginRes2.body.data.accessToken
    })

    afterAll(async () => {
        if (createdSessionId) {
            await prisma.session.deleteMany({ where: { id: createdSessionId } })
        }
        if (user1Id) {
            await cleanupTestUser({ id: user1Id })
        }
        if (user2Id) {
            await cleanupTestUser({ id: user2Id })
        }
    })

    it('1. GET /api/v1/session - unauthorized without token (401)', async () => {
        const res = await request(app).get('/api/v1/session').set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. POST /api/v1/session - creates a new session with prompt', async () => {
        const res = await request(app)
            .post('/api/v1/session')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
                title: 'Integration Test Session',
                type: 'WEB',
                prompt: 'Build a Next.js portfolio website',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.session).toBeDefined()
        expect(res.body.data.session.title).toBe('Integration Test Session')
        expect(res.body.data.session.userId).toBe(user1Id)

        createdSessionId = res.body.data.session.id
    })

    it('3. GET /api/v1/session - returns user sessions with pagination', async () => {
        const res = await request(app)
            .get('/api/v1/session')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.sessions).toBeArray()
        expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1)
        const sessionIds = res.body.data.sessions.map((s: any) => s.id)
        expect(sessionIds).toContain(createdSessionId)
    })

    it('4. GET /api/v1/session/:id - fetches session details and chat messages', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.session.id).toBe(createdSessionId)
        expect(res.body.data.chatMessages).toBeArray()
        expect(res.body.data.chatMessages.length).toBe(1)
        expect(res.body.data.chatMessages[0].content).toBe('Build a Next.js portfolio website')
    })

    it('4b. GET /api/v1/session/:id/messages - returns paginated session messages', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${createdSessionId}/messages?limit=10`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.messages).toBeArray()
    })

    it('5. PATCH /api/v1/session/:id/rename - renames session', async () => {
        const res = await request(app)
            .patch(`/api/v1/session/${createdSessionId}/rename`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ title: 'Renamed Portfolio Session' })

        expect(res.status).toBe(200)
        expect(res.body.data.session.title).toBe('Renamed Portfolio Session')
    })

    it('6. PUT /api/v1/session/:id/tags - updates session tags', async () => {
        const res = await request(app)
            .put(`/api/v1/session/${createdSessionId}/tags`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ tags: ['portfolio'] })

        expect(res.status).toBe(200)
        expect(res.body.data.session.tags).toEqual(['portfolio'])
    })

    it('7. PATCH /api/v1/session/:id/archive & unarchive - toggles archived state', async () => {
        // Archive
        const archRes = await request(app)
            .patch(`/api/v1/session/${createdSessionId}/archive`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(archRes.status).toBe(200)
        expect(archRes.body.data.session.isArchived).toBe(true)

        // Unarchive
        const unarchRes = await request(app)
            .patch(`/api/v1/session/${createdSessionId}/unarchive`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(unarchRes.status).toBe(200)
        expect(unarchRes.body.data.session.isArchived).toBe(false)
    })

    it('8. GET /api/v1/session/:id/insights - returns session telemetry and insights', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${createdSessionId}/insights`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.telemetry).toBeDefined()
        expect(res.body.data.telemetry.totalMessages).toBe(1)
        expect(res.body.data.insights).toBeArray()
    })

    it('9. GET /api/v1/session/:id/rehydrate - rehydrates session state', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${createdSessionId}/rehydrate`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.session.id).toBe(createdSessionId)
        expect(res.body.data.messages).toBeArray()
    })

    it('10. POST /api/v1/session/:id/disconnect - emits disconnect signal', async () => {
        const res = await request(app)
            .post(`/api/v1/session/${createdSessionId}/disconnect`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)
        expect(res.body.data.message).toContain('Disconnect signal received')
    })

    it('11. GET /api/v1/session/:id/preview/:port - resolves preview target', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${createdSessionId}/preview/3000`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body.data.port).toBe(3000)
        expect(res.body.data.targetHost).toContain('3000')
    })

    it('12. Collaborator Management - add, list, permission check, and remove', async () => {
        // User 2 tries to access User 1's session before being added -> 404 (or access denied)
        const unauthGet = await request(app)
            .get(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user2Token}`)
        expect(unauthGet.status).toBe(404)

        // User 1 adds User 2 as collaborator
        const addRes = await request(app)
            .post(`/api/v1/session/${createdSessionId}/collaborators`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ email: user2Email })

        expect(addRes.status).toBe(200)
        expect(addRes.body.data.collaborator.userId).toBe(user2Id)

        // User 2 can now access the session
        const authGet = await request(app)
            .get(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user2Token}`)
        expect(authGet.status).toBe(200)

        // User 2 cannot add another collaborator (403)
        const invalidAdd = await request(app)
            .post(`/api/v1/session/${createdSessionId}/collaborators`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user2Token}`)
            .send({ email: 'someother@example.com' })
        expect(invalidAdd.status).toBe(403)

        // User 1 removes User 2 from collaborators
        const removeRes = await request(app)
            .delete(`/api/v1/session/${createdSessionId}/collaborators/${user2Email}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(removeRes.status).toBe(200)

        // User 2 can no longer access the session
        const revokedGet = await request(app)
            .get(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user2Token}`)
        expect(revokedGet.status).toBe(404)
    })

    it('13. DELETE /api/v1/session/:id - non-creator cannot delete (403)', async () => {
        const res = await request(app)
            .delete(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user2Token}`)

        expect(res.status).toBe(403)
    })

    it('14. DELETE /api/v1/session/:id - creator deletes session successfully', async () => {
        const res = await request(app)
            .delete(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(200)

        // Verify session no longer exists
        const checkRes = await request(app)
            .get(`/api/v1/session/${createdSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)
        expect(checkRes.status).toBe(404)
    })

    it('15. GET /api/v1/session/:id - returns 404 for non-existent session', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000'
        const res = await request(app)
            .get(`/api/v1/session/${nonExistentId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${user1Token}`)

        expect(res.status).toBe(404)
    })
})
