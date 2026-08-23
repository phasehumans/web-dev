import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Review Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let createdReviewId: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `reviewtest-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Review Test User',
                username: `review_${timestamp}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
                creditBalance: 5000,
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `review-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.pullRequestReview
                .deleteMany({ where: { userId: testUserId } })
                .catch(() => {
                    // Intentionally swallowed: test cleanup fallback
                })
            await prisma.reviewPreference
                .deleteMany({ where: { userId: testUserId } })
                .catch(() => {
                    // Intentionally swallowed: test cleanup fallback
                })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. GET /api/v1/review/preferences - unauthorized without token (401)', async () => {
        const res = await request(app)
            .get('/api/v1/review/preferences')
            .set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/review/preferences - returns default preferences (200)', async () => {
        const res = await request(app)
            .get('/api/v1/review/preferences')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data).toBeDefined()
    })

    it('3. PUT /api/v1/review/preferences - updates review preferences (200)', async () => {
        const res = await request(app)
            .put('/api/v1/review/preferences')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                autoReviewAgentPrs: true,
                defaultStrictness: 'STRICT',
                focusAreas: ['SECURITY', 'PERFORMANCE'],
            })

        expect(res.status).toBe(200)
        expect(res.body.data.defaultStrictness).toBe('STRICT')
        expect(res.body.data.autoReviewAgentPrs).toBe(true)
    })

    it('4. POST /api/v1/review - creates a new PR review (201)', async () => {
        const res = await request(app)
            .post('/api/v1/review')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                prUrl: 'https://github.com/facebook/react/pull/12345',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.id).toBeDefined()
        expect(res.body.data.repository).toBe('facebook/react')
        expect(res.body.data.prNumber).toBe(12345)
        createdReviewId = res.body.data.id
    })

    it('5. GET /api/v1/review - lists reviews for user (200)', async () => {
        const res = await request(app)
            .get('/api/v1/review')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.reviews).toBeArray()
        expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1)
        const ids = res.body.data.reviews.map((r: any) => r.id)
        expect(ids).toContain(createdReviewId)
    })

    it('6. GET /api/v1/review/:id - fetches individual review details (200)', async () => {
        const res = await request(app)
            .get(`/api/v1/review/${createdReviewId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.id).toBe(createdReviewId)
        expect(res.body.data.repository).toBe('facebook/react')
    })

    it('7. DELETE /api/v1/review/:id - deletes review (200)', async () => {
        const res = await request(app)
            .delete(`/api/v1/review/${createdReviewId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)

        const checkRes = await request(app)
            .get(`/api/v1/review/${createdReviewId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(checkRes.status).toBe(404)
    })
})
