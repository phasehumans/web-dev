import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { hashRefreshToken } from '../../src/modules/auth/auth.utils'

describe('Auth Module Hardening & SHA-256 Token Hashing', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let refreshToken: string

    beforeAll(async () => {
        testEmail = `authtest-${Date.now()}@example.com`
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.user.delete({ where: { id: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
        }
    })

    it('POST /api/v1/auth/signup - creates unverified user and sends OTP', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup')
            .set('x-forwarded-for', '10.0.0.1')
            .send({ email: testEmail, password: testPassword })

        expect(res.status).toBe(201)
        expect(res.body.message).toBe('otp sent to email')

        const user = await prisma.user.findUnique({ where: { email: testEmail } })
        expect(user).not.toBeNull()
        expect(user?.emailVerified).toBe(false)
        testUserId = user!.id
    })

    it('POST /api/v1/auth/login - fails for unverified user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', '10.0.0.2')
            .send({ email: testEmail, password: testPassword })

        expect(res.status).toBe(401)
        expect(res.body.message).toBe('please verify your email')
    })

    it('POST /api/v1/auth/verify - verifies user with OTP and generates session with SHA-256 token hash', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const otpHash = await bcrypt.hash('123456', env.BCRYPT_SALT_ROUNDS)

        await prisma.user.update({
            where: { email: testEmail },
            data: {
                otpHash,
                otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })

        const res = await request(app)
            .post('/api/v1/auth/verify')
            .set('x-forwarded-for', '10.0.0.3')
            .send({ email: testEmail, otp: '123456' })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()
        expect(res.body.data.refreshToken).toBeDefined()

        accessToken = res.body.data.accessToken
        refreshToken = res.body.data.refreshToken

        const expectedHash = hashRefreshToken(refreshToken)
        const session = await prisma.authSession.findFirst({ where: { userId: testUserId } })

        expect(session).not.toBeNull()
        expect(session?.refreshTokenHash).toBe(expectedHash)
    })

    it('POST /api/v1/auth/refresh - refreshes session using SHA-256 refresh token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', '10.0.0.4')
            .send({ refreshToken })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()
        expect(res.body.data.refreshToken).toBeDefined()

        const newRefreshToken = res.body.data.refreshToken
        expect(newRefreshToken).not.toBe(refreshToken)

        const expectedNewHash = hashRefreshToken(newRefreshToken)
        const session = await prisma.authSession.findFirst({ where: { userId: testUserId } })
        expect(session?.refreshTokenHash).toBe(expectedNewHash)

        refreshToken = newRefreshToken
    })

    it('POST /api/v1/auth/refresh - accepts recently rotated refresh token within grace window', async () => {
        const firstToken = refreshToken

        const res1 = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', '10.0.0.5')
            .send({ refreshToken: firstToken })

        expect(res1.status).toBe(200)
        const secondToken = res1.body.data.refreshToken

        const resConcurrent = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', '10.0.0.5')
            .send({ refreshToken: firstToken })

        expect(resConcurrent.status).toBe(200)
        expect(resConcurrent.body.data.accessToken).toBeDefined()

        refreshToken = secondToken
    })

    it('POST /api/v1/auth/refresh - rejects token if rotated outside grace window', async () => {
        const firstToken = refreshToken

        const res1 = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', '10.0.0.6')
            .send({ refreshToken: firstToken })
        expect(res1.status).toBe(200)

        await prisma.authSession.updateMany({
            where: { userId: testUserId },
            data: { rotatedAt: new Date(Date.now() - 65 * 1000) },
        })

        const { sessionCache } = await import('../../src/modules/auth/auth.cache')
        sessionCache.clear()

        const resExpiredGrace = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', '10.0.0.6')
            .send({ refreshToken: firstToken })

        expect(resExpiredGrace.status).toBe(401)
        expect(resExpiredGrace.body.message).toBe('invalid refresh token')
    })

    it('GET /api/v1/auth/cli-token - validates access token with cached session lookup', async () => {
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', '10.0.0.7')
            .send({ email: testEmail, password: testPassword })

        expect(loginRes.status).toBe(200)
        accessToken = loginRes.body.data.accessToken

        const res1 = await request(app)
            .get('/api/v1/auth/cli-token')
            .set('x-forwarded-for', '10.0.0.7')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res1.status).toBe(200)

        const res2 = await request(app)
            .get('/api/v1/auth/cli-token')
            .set('x-forwarded-for', '10.0.0.7')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res2.status).toBe(200)
    })

    it('POST /api/v1/auth/signout - revokes session and invalidates cache immediately', async () => {
        const resSignout = await request(app)
            .post('/api/v1/auth/signout')
            .set('x-forwarded-for', '10.0.0.8')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(resSignout.status).toBe(200)
        expect(resSignout.body.message).toBe('signed out successfully')

        const resProtected = await request(app)
            .get('/api/v1/auth/cli-token')
            .set('x-forwarded-for', '10.0.0.8')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(resProtected.status).toBe(401)
        expect(resProtected.body.message).toBe('Session revoked')
    })

    it('authService.purgeExpiredAndRevokedSessions - purges expired and revoked sessions', async () => {
        const expiredSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: 'expired-hash-12345',
                expiresAt: new Date(Date.now() - 60000),
            },
        })

        const revokedSession = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: 'revoked-hash-12345',
                expiresAt: new Date(Date.now() + 86400000),
                isRevoked: true,
                revokedAt: new Date(),
            },
        })

        const { authService } = await import('../../src/modules/auth/auth.service')
        await authService.purgeExpiredAndRevokedSessions()

        const checkExpired = await prisma.authSession.findUnique({
            where: { id: expiredSession.id },
        })
        const checkRevoked = await prisma.authSession.findUnique({
            where: { id: revokedSession.id },
        })

        expect(checkExpired).toBeNull()
        expect(checkRevoked).toBeNull()
    })

    it('POST /api/v1/auth/login - returns 429 when rate limit threshold is exceeded', async () => {
        const RATE_LIMIT_TEST_IP = '10.99.99.99'
        let rateLimitedRes: any
        for (let i = 0; i < 25; i++) {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .set('x-forwarded-for', RATE_LIMIT_TEST_IP)
                .send({ email: 'ratelimit@example.com', password: 'Password123!' })
            if (res.status === 429) {
                rateLimitedRes = res
                break
            }
        }

        expect(rateLimitedRes).toBeDefined()
        expect(rateLimitedRes?.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
})
