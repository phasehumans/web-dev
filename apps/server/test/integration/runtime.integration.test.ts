import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Runtime Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let testSessionId: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `runtimetest-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Runtime Test User',
                username: `runtime_${timestamp}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const authSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `runtime-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: authSession.id })

        const session = await prisma.session.create({
            data: {
                userId: testUserId,
                title: 'Runtime Test Session',
                vmStatus: 'PROVISIONING',
            },
        })
        testSessionId = session.id
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.session.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. POST /api/v1/runtime/previews/start - unauthorized without token (401)', async () => {
        const res = await request(app)
            .post('/api/v1/runtime/previews/start')
            .set('x-forwarded-for', getRandomIP())
            .send({ projectId: testSessionId })

        expect(res.status).toBe(401)
    })

    it('2. POST /api/v1/runtime/previews/start - starts preview for session (200)', async () => {
        const res = await request(app)
            .post('/api/v1/runtime/previews/start')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ projectId: testSessionId })

        expect(res.status).toBe(200)
        expect(res.body.data.previewId).toBe(testSessionId)
        expect(res.body.data.state).toBe('Healthy')
    })

    it('3. GET /api/v1/runtime/previews/:id/status - gets preview status (200)', async () => {
        const res = await request(app)
            .get(`/api/v1/runtime/previews/${testSessionId}/status`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.previewId).toBe(testSessionId)
    })

    it('4. POST /api/v1/runtime/previews/:id/callback - receives runtime callback without auth (200)', async () => {
        const res = await request(app)
            .post(`/api/v1/runtime/previews/${testSessionId}/callback`)
            .set('x-forwarded-for', getRandomIP())
            .send({
                previewId: testSessionId,
                projectId: testSessionId,
                status: 'ready',
                state: 'Healthy',
                updatedAt: new Date().toISOString(),
            })

        expect(res.status).toBe(200)
        expect(res.body.data.previewId).toBe(testSessionId)
    })

    it('5. DELETE /api/v1/runtime/previews/:id - stops and deletes preview (200)', async () => {
        const res = await request(app)
            .delete(`/api/v1/runtime/previews/${testSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.deleted).toBe(true)
    })
})
