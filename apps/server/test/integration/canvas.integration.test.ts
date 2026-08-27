import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'

describe('Canvas Integration Tests', () => {
    let testUserId: string
    let testSessionId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string

    beforeAll(async () => {
        testEmail = `canvastest-${Date.now()}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Canvas Test User',
                username: `canvasuser_${Date.now()}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const session = await prisma.session.create({
            data: {
                userId: testUserId,
                title: 'Canvas Test Session',
                vmStatus: 'RUNNING',
            },
        })
        testSessionId = session.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const authSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: 'test-hash-' + Date.now(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: authSession.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.session.deleteMany({ where: { userId: testUserId } }).catch(() => {})
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {})
            await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
        }
    })

    it('POST /api/v1/canvas/save - returns 401 when unauthorized', async () => {
        const res = await request(app)
            .post('/api/v1/canvas/save')
            .send({
                sessionId: testSessionId,
                canvasState: {
                    items: [],
                    connections: [],
                    pan: { x: 0, y: 0 },
                    scale: 100,
                    hasInteracted: false,
                },
            })
        expect(res.status).toBe(401)
    })

    it('POST /api/v1/canvas/save - returns 403 when user lacks access to session', async () => {
        const otherSessionId = '00000000-0000-0000-0000-000000000000'
        const res = await request(app)
            .post('/api/v1/canvas/save')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                sessionId: otherSessionId,
                canvasState: {
                    items: [],
                    connections: [],
                    pan: { x: 0, y: 0 },
                    scale: 100,
                    hasInteracted: false,
                },
            })

        expect(res.status).toBe(403)
    })

    it('POST /api/v1/canvas/save - saves canvas document for authorized user session', async () => {
        const canvasState = {
            items: [
                {
                    id: 'note-1',
                    type: 'note',
                    x: 50,
                    y: 100,
                    content: 'Integration Note',
                },
            ],
            connections: [],
            pan: { x: 10, y: 20 },
            scale: 100,
            hasInteracted: true,
        }

        const res = await request(app)
            .post('/api/v1/canvas/save')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                sessionId: testSessionId,
                canvasState,
            })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.canvasState.items.length).toBe(1)
        expect(res.body.data.canvasState.items[0].content).toBe('Integration Note')
    })

    it('POST /api/v1/canvas/web-clips - returns 400 for invalid URL format', async () => {
        const res = await request(app)
            .post('/api/v1/canvas/web-clips')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                url: 'invalid-url',
                sessionId: testSessionId,
            })

        expect(res.status).toBe(400)
    })

    it('POST /api/v1/canvas/web-clips - returns web clips response for valid URL & session', async () => {
        const res = await request(app)
            .post('/api/v1/canvas/web-clips')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                url: 'https://example.com',
                sessionId: testSessionId,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.sourceUrl).toBe('https://example.com')
        expect(res.body.data.clips).toBeArray()
    })

    it('POST /api/v1/canvas/waitlist - returns 401 when unauthorized', async () => {
        const res = await request(app).post('/api/v1/canvas/waitlist')
        expect(res.status).toBe(401)
    })

    it('POST /api/v1/canvas/waitlist - marks user canvasWaitlist as true', async () => {
        const res = await request(app)
            .post('/api/v1/canvas/waitlist')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.canvasWaitlist).toBe(true)

        const user = await prisma.user.findUnique({
            where: { id: testUserId },
            select: { canvasWaitlist: true },
        })
        expect(user?.canvasWaitlist).toBe(true)
    })
})
