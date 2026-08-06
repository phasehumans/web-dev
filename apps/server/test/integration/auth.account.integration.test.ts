import { prisma } from '@december/database'
import { describe, it, expect, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Auth Account Management & Signout All Integration Tests', () => {
    const testEmail = `accounttest-${Date.now()}@example.com`
    const testPassword = 'Password123!'
    let testUserId: string
    let accessToken: string

    afterAll(async () => {
        if (testUserId) {
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('setup: create user with multiple active sessions', async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Account Test User',
                username: `accountuser-${Date.now()}`,
                password: passHash,
                emailVerified: true,
            },
        })
        testUserId = user.id

        // Login twice to create 2 sessions
        const loginRes1 = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })
        accessToken = loginRes1.body.data.accessToken

        await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        const activeSessions = await prisma.authSession.findMany({
            where: { userId: testUserId, isRevoked: false },
        })
        expect(activeSessions.length).toBeGreaterThanOrEqual(2)
    })

    it('1. POST /api/v1/auth/signout/all - revokes all active sessions for user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signout/all')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('signed out from all devices successfully')

        const activeSessions = await prisma.authSession.findMany({
            where: { userId: testUserId, isRevoked: false },
        })
        expect(activeSessions.length).toBe(0)
    })

    it('2. DELETE /api/v1/auth/account - soft deletes user account and clears OAuth tokens', async () => {
        // Relogin to get fresh token
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })
        const freshAccessToken = loginRes.body.data.accessToken

        const deleteRes = await request(app)
            .delete('/api/v1/auth/account')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${freshAccessToken}`)

        expect(deleteRes.status).toBe(200)
        expect(deleteRes.body.message).toBe('account deleted successfully')

        const user = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(user?.isDeleted).toBe(true)
        expect(user?.deletedAt).not.toBeNull()

        // Trying to login with deleted account should fail
        const loginDeletedRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        expect(loginDeletedRes.status).toBe(401)
        expect(loginDeletedRes.body.message).toBe('account has been deleted')
    })
})
