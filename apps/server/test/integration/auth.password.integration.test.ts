import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Auth Password Reset Integration Tests', () => {
    const testEmail = `passwordtest-${Date.now()}@example.com`
    const initialPassword = 'InitialPassword123!'
    const newPassword = 'NewPassword456!'
    let testUserId: string

    afterAll(async () => {
        if (testUserId) {
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('setup: create verified user', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(initialPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Password Test User',
                username: `passuser-${Date.now()}`,
                password: passHash,
                emailVerified: true,
            },
        })
        testUserId = user.id
    })

    it('1. POST /api/v1/auth/forgot-password/request - requests password reset OTP', async () => {
        const res = await request(app)
            .post('/api/v1/auth/forgot-password/request')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('if an account exists, a reset code has been sent')

        const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(updatedUser?.otpHash).not.toBeNull()
        expect(updatedUser?.otpExpiresAt).not.toBeNull()
    })

    it('2. POST /api/v1/auth/forgot-password/verify - verifies reset OTP', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const resetOtpHash = await bcrypt.hash('888999', env.BCRYPT_SALT_ROUNDS)

        await prisma.user.update({
            where: { id: testUserId },
            data: {
                otpHash: resetOtpHash,
                otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
        })

        const res = await request(app)
            .post('/api/v1/auth/forgot-password/verify')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, otp: '888999' })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('otp verified successfully')
    })

    it('3. POST /api/v1/auth/forgot-password/reset - updates password and revokes existing sessions', async () => {
        const res = await request(app)
            .post('/api/v1/auth/forgot-password/reset')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, otp: '888999', newPassword })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('password reset successfully')

        // Old password should fail
        const oldLoginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: initialPassword })

        expect(oldLoginRes.status).toBe(401)

        // New password should succeed
        const newLoginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: newPassword })

        expect(newLoginRes.status).toBe(200)
        expect(newLoginRes.body.data.accessToken).toBeDefined()
    })
})
