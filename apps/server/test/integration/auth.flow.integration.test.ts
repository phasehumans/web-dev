import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Auth Flow Integration Tests (Signup, Verify, Login, CLI Token, Signout)', () => {
    const testEmail = `flowtest-${Date.now()}@example.com`
    const testPassword = 'Password123!'
    let testUserId: string
    let accessToken: string
    let refreshToken: string

    afterAll(async () => {
        if (testUserId) {
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. POST /api/v1/auth/signup - creates unverified user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        expect(res.status).toBe(201)
        expect(res.body.message).toBe('otp sent to email')

        const user = await prisma.user.findUnique({ where: { email: testEmail } })
        expect(user).not.toBeNull()
        expect(user?.emailVerified).toBe(false)
        testUserId = user!.id
    })

    it('2. POST /api/v1/auth/verify - verifies OTP and issues tokens', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const otpHash = await bcrypt.hash('654321', env.BCRYPT_SALT_ROUNDS)

        await prisma.user.update({
            where: { id: testUserId },
            data: {
                otpHash,
                otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })

        const res = await request(app)
            .post('/api/v1/auth/verify')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, otp: '654321' })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()

        accessToken = res.body.data.accessToken

        const user = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(user?.emailVerified).toBe(true)
    })

    it('3. POST /api/v1/auth/login - authenticates verified user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        expect(res.status).toBe(200)
        expect(res.body.data.accessToken).toBeDefined()

        accessToken = res.body.data.accessToken
    })

    it('4. GET /api/v1/auth/cli-token - returns active token and email', async () => {
        const res = await request(app)
            .get('/api/v1/auth/cli-token')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.email).toBe(testEmail)
        expect(res.body.data.token).toBeDefined()
    })

    it('5. POST /api/v1/auth/signout - revokes active session', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signout')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('signed out successfully')

        // Subsequent authenticated request should fail
        const resProtected = await request(app)
            .get('/api/v1/auth/cli-token')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(resProtected.status).toBe(401)
    })
})
