import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Auth Device CLI Flow Integration Tests', () => {
    const testEmail = `devicetest-${Date.now()}@example.com`
    let testUserId: string
    let userAccessToken: string
    let deviceCode: string
    let userCode: string

    afterAll(async () => {
        if (testUserId) {
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('setup: create authenticated user for device verification', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash('Password123!', env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Device Test User',
                username: `deviceuser-${Date.now()}`,
                password: passHash,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: 'Password123!' })

        userAccessToken = loginRes.body.data.accessToken
    })

    it('1. POST /api/v1/auth/device/code - generates deviceCode & userCode', async () => {
        const res = await request(app)
            .post('/api/v1/auth/device/code')
            .set('x-forwarded-for', getRandomIP())
            .send({})

        expect(res.status).toBe(200)
        expect(res.body.data.deviceCode).toBeDefined()
        expect(res.body.data.userCode).toBeDefined()
        expect(res.body.data.verificationUri).toBeDefined()

        deviceCode = res.body.data.deviceCode
        userCode = res.body.data.userCode
    })

    it('2. POST /api/v1/auth/device/token - returns authorization_pending when pending', async () => {
        const res = await request(app)
            .post('/api/v1/auth/device/token')
            .set('x-forwarded-for', getRandomIP())
            .send({ deviceCode })

        expect(res.status).toBe(400)
        expect(res.body.message).toBe('authorization_pending')
    })

    it('3. POST /api/v1/auth/device/verify - authorizes device code with logged-in user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/device/verify')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userAccessToken}`)
            .send({ userCode })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('device successfully authorized')
    })

    it('4. POST /api/v1/auth/device/token - returns access token once approved', async () => {
        const res = await request(app)
            .post('/api/v1/auth/device/token')
            .set('x-forwarded-for', getRandomIP())
            .send({ deviceCode })

        expect(res.status).toBe(200)
        expect(res.body.data.token).toBeDefined()
        expect(res.body.data.email).toBe(testEmail)
    })
})
