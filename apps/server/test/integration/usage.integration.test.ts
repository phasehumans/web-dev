import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Usage Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `usagetest-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Usage Test User',
                username: `usage_${timestamp}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
                creditBalance: 500, // 500 cents = $5.00
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `usage-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.usageEvent.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. GET /api/v1/usage - unauthorized without token (401)', async () => {
        const res = await request(app).get('/api/v1/usage').set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/usage - returns current usage and credit info for authenticated user', async () => {
        const res = await request(app)
            .get('/api/v1/usage')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.credits.remainingInCents).toBe(500)
        expect(res.body.data.usage).toBeDefined()
    })

    it('3. GET /api/v1/usage/check - checks enough credits with estimatedCostInCents', async () => {
        const res = await request(app)
            .get('/api/v1/usage/check?estimatedCostInCents=100')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.enoughCredits).toBe(true)
        expect(res.body.data.estimatedCostInCents).toBe(100)
    })

    it('4. GET /api/v1/usage/check - returns enoughCredits false when estimate exceeds balance', async () => {
        const res = await request(app)
            .get('/api/v1/usage/check?estimatedCostInCents=10000')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.enoughCredits).toBe(false)
    })
})
