import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Setting Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string
    let username: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `settingtest-${timestamp}@example.com`
        username = `setuser_${timestamp}`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Setting Test User',
                username,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../../src/modules/auth/auth.utils')
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `test-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.feedback.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. GET /api/v1/setting - unauthorized without token (401)', async () => {
        const res = await request(app).get('/api/v1/setting').set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/setting/me - returns user basic info', async () => {
        const res = await request(app)
            .get('/api/v1/setting/me')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.fullName).toBe('Setting Test User')
        expect(res.body.data.isGithubConnected).toBe(false)
    })

    it('3. GET /api/v1/setting - returns user profile', async () => {
        const res = await request(app)
            .get('/api/v1/setting')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.id).toBe(testUserId)
        expect(res.body.data.email).toBe(testEmail)
        expect(res.body.data.hasPassword).toBe(true)
    })

    it('4. PATCH /api/v1/setting/name - updates display name', async () => {
        const res = await request(app)
            .patch('/api/v1/setting/name')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Updated Name' })

        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Updated Name')

        const dbUser = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(dbUser?.name).toBe('Updated Name')
    })

    it('5. PATCH /api/v1/setting/username - updates username', async () => {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'
        const randomLetters = Array.from({ length: 6 }, () =>
            alphabet.charAt(Math.floor(Math.random() * alphabet.length))
        ).join('')
        const newUsername = `new_usr_${randomLetters}`
        const res = await request(app)
            .patch('/api/v1/setting/username')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ username: newUsername })

        expect(res.status).toBe(200)
        expect(res.body.data.username).toBe(newUsername)
    })

    it('6. PATCH /api/v1/setting/notifications - updates notification preferences', async () => {
        const res = await request(app)
            .patch('/api/v1/setting/notifications')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                notifyProjectActivity: false,
                notifyProductUpdates: true,
                notifySecurityAlerts: false,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.notifyProjectActivity).toBe(false)
        expect(res.body.data.notifyProductUpdates).toBe(true)
        expect(res.body.data.notifySecurityAlerts).toBe(false)
    })

    it('7. PATCH /api/v1/setting/onboarding - marks onboarding complete', async () => {
        const res = await request(app)
            .patch('/api/v1/setting/onboarding')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.hasCompletedOnboarding).toBe(true)
    })

    it('8. POST /api/v1/setting/onboarding/dismiss - dismisses an onboarding card', async () => {
        const res = await request(app)
            .post('/api/v1/setting/onboarding/dismiss')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ card: 'welcome' })

        expect(res.status).toBe(200)
        expect(res.body.data.welcomeCardDone).toBe(true)
    })

    it('9. POST /api/v1/setting/sound - updates generation sound setting', async () => {
        const res = await request(app)
            .post('/api/v1/setting/sound')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ generationSound: 'NEVER' })

        expect(res.status).toBe(200)
        expect(res.body.data.generationSound).toBe('NEVER')
    })

    it('10. POST /api/v1/setting/feedback - submits user feedback', async () => {
        const res = await request(app)
            .post('/api/v1/setting/feedback')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                rating: 'happy',
                feedback: 'Everything works smoothly!',
            })

        expect(res.status).toBe(200)
        expect(res.body.data.feedbackCardDone).toBe(true)

        const fb = await prisma.feedback.findFirst({ where: { userId: testUserId } })
        expect(fb).not.toBeNull()
        expect(fb?.rating).toBe('happy')
        expect(fb?.feedback).toBe('Everything works smoothly!')
    })

    it('11. PATCH /api/v1/setting/password - updates user password', async () => {
        const newPassword = 'NewPassword456!'
        const res = await request(app)
            .patch('/api/v1/setting/password')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                currentPassword: testPassword,
                newPassword,
            })

        expect(res.status).toBe(200)
        expect(res.body.data.success).toBe(true)
    })
})
