import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
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
        refreshToken = loginRes.body.data.accessToken
    })

    it('1. POST /api/v1/auth/refresh - refreshes session and returns 30-day session token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()

        const session = await prisma.authSession.findFirst({ where: { userId: testUserId } })
        expect(session).toBeDefined()
    })

    it('2. POST /api/v1/auth/refresh - rejects expired session', async () => {
        // Force expiresAt timestamp in DB to past
        await prisma.authSession.updateMany({
            where: { userId: testUserId },
            data: { expiresAt: new Date(Date.now() - 1000) },
        })

        const { sessionCache } = await import('../../src/modules/auth/auth.cache')
        sessionCache.clear()

        const resExpired = await request(app)
            .post('/api/v1/auth/refresh')
            .set('x-forwarded-for', getRandomIP())
            .send({ refreshToken })

        expect(resExpired.status).toBe(401)
        expect(resExpired.body.message).toBe('session expired')
    })
})
