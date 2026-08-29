import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { hashRefreshToken } from '../../src/modules/auth/auth.utils'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Auth Refresh Token & Rotation Integration Tests', () => {
    const testEmail = `refreshtest-${Date.now()}@example.com`
    const testPassword = 'Password123!'
    let testUserId: string
    let refreshToken: string

    afterAll(async () => {
        if (testUserId) {
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('setup: signup & verify user', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Refresh Test User',
                username: `refreshuser-${Date.now()}`,
                password: passHash,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        expect(loginRes.status).toBe(200)
        refreshToken = loginRes.body.data.refreshToken
    })

    it('1. POST /api/v1/auth/refresh - rotates refresh token and updates DB session', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()
        expect(res.body.data.refreshToken).toBeDefined()

        const newRefreshToken = res.body.data.refreshToken
        expect(newRefreshToken).not.toBe(refreshToken)

        const expectedHash = hashRefreshToken(newRefreshToken)
        const session = await prisma.authSession.findFirst({ where: { userId: testUserId } })

        expect(session?.refreshTokenHash).toBe(expectedHash)
        refreshToken = newRefreshToken
    })

    it('2. POST /api/v1/auth/refresh - allows previous token reuse within grace window', async () => {
        const oldToken = refreshToken

        const res1 = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken: oldToken })

        expect(res1.status).toBe(200)
        const rotatedToken = res1.body.data.refreshToken

        // Reuse old token immediately within grace period
        const resGrace = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken: oldToken })

        expect(resGrace.status).toBe(200)
        expect(resGrace.body.data.accessToken).toBeDefined()
        expect(resGrace.body.data.refreshToken).toBeDefined()

        refreshToken = resGrace.body.data.refreshToken
    })

    it('3. POST /api/v1/auth/refresh - rejects token after grace window expires', async () => {
        const oldToken = refreshToken

        const res1 = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken: oldToken })

        expect(res1.status).toBe(200)

        // Force rotatedAt timestamp to > 24h ago in DB (grace period is 24h)
        await prisma.authSession.updateMany({
            where: { userId: testUserId },
            data: { rotatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
        })

        const { sessionCache } = await import('../../src/modules/auth/auth.cache')
        sessionCache.clear()

        const resExpiredGrace = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken: oldToken })

        expect(resExpiredGrace.status).toBe(401)
        expect(resExpiredGrace.body.message).toBe('invalid refresh token')
    })
})
