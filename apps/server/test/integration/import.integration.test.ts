import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Upload/Import Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let createdImportId: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `importtest-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Import Test User',
                username: `import_${timestamp}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
                githubConnected: true,
                githubToken: 'gho_dummy_token_123',
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const authSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `import-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: authSession.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.sessionImport.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.message
                .deleteMany({ where: { session: { userId: testUserId } } })
                .catch(() => {
                    // Intentionally swallowed: test cleanup fallback
                })
            await prisma.session.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. POST /api/v1/upload/github - unauthorized without token (401)', async () => {
        const res = await request(app)
            .post('/api/v1/upload/github')
            .set('x-forwarded-for', getRandomIP())
            .send({ repoURL: 'https://github.com/phasehumans/december' })

        expect(res.status).toBe(401)
    })

    it('2. POST /api/v1/upload/github - fails validation on invalid URL (400)', async () => {
        const res = await request(app)
            .post('/api/v1/upload/github')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ repoURL: 'invalid-url' })

        expect(res.status).toBe(400)
    })

    it('3. POST /api/v1/upload/github - initiates import from GitHub (202)', async () => {
        const res = await request(app)
            .post('/api/v1/upload/github')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ repoURL: 'https://github.com/phasehumans/december' })

        expect(res.status).toBe(202)
        expect(res.body.data.id).toBeDefined()
        expect(res.body.data.sourceType).toBe('GITHUB')
        createdImportId = res.body.data.id
    })

    it('4. GET /api/v1/upload/:id - fetches import status (200)', async () => {
        const res = await request(app)
            .get(`/api/v1/upload/${createdImportId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.id).toBe(createdImportId)
        expect(res.body.data.sourceType).toBe('GITHUB')
    })
})
