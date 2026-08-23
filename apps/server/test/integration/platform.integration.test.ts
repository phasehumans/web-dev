import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Platform Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let testSessionId: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `platformtest-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Platform Test User',
                username: `platform_${timestamp}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
                githubConnected: false,
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const authSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `platform-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: authSession.id })

        const session = await prisma.session.create({
            data: {
                userId: testUserId,
                title: 'Platform Test Session',
                vmStatus: 'STOPPED',
                githubRepoName: 'test-repo',
                githubRepoOwner: 'test-owner',
                vercelProjectId: 'test-vercel-proj',
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

    it('1. GET /api/v1/platform/:sessionId/download - unauthorized without token (401)', async () => {
        const res = await request(app)
            .get(`/api/v1/platform/${testSessionId}/download`)
            .set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/platform/:sessionId/download - downloads session as zip (200)', async () => {
        const res = await request(app)
            .get(`/api/v1/platform/${testSessionId}/download`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('application/zip')
    })

    it('3. POST /api/v1/platform/:sessionId/env/sync - returns message when no env vars to sync (200)', async () => {
        const res = await request(app)
            .post(`/api/v1/platform/${testSessionId}/env/sync`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({})

        expect(res.status).toBe(200)
        expect(res.body.data.message).toBe('No environment variables to sync')
    })

    it('4. POST /api/v1/platform/sessions/:sessionId/github/unlink - unlinks github repo (200)', async () => {
        const res = await request(app)
            .post(`/api/v1/platform/sessions/${testSessionId}/github/unlink`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.message).toBe('GitHub repository unlinked successfully')

        const dbSession = await prisma.session.findUnique({ where: { id: testSessionId } })
        expect(dbSession?.githubRepoName).toBeNull()
    })

    it('5. POST /api/v1/platform/:sessionId/vercel/unlink - unlinks vercel project (200)', async () => {
        const res = await request(app)
            .post(`/api/v1/platform/${testSessionId}/vercel/unlink`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.message).toBe('Vercel project unlinked successfully')

        const dbSession = await prisma.session.findUnique({ where: { id: testSessionId } })
        expect(dbSession?.vercelProjectId).toBeNull()
    })
})
