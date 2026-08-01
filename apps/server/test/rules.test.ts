import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../src/app'

describe('Setting Module Custom Rules Endpoints', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string

    beforeAll(async () => {
        testEmail = `rulestest-${Date.now()}@example.com`

        // Create verified user
        const bcrypt = await import('bcrypt')
        const { env } = await import('../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Rules Test User',
                username: `rulestest_${Date.now()}`,
                email: testEmail,
                password: hashedPassword,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const { generateAccessToken } = await import('../src/modules/auth/auth.utils')
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: 'test-hash-' + Date.now(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
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

    it('GET /api/v1/setting/rules - returns null when no rules set', async () => {
        const res = await request(app)
            .get('/api/v1/setting/rules')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual({ rules: null })
    })

    it('POST /api/v1/setting/rules - updates user rules', async () => {
        const rulesContent = '# Test Rules\n- Rule 1\n- Rule 2'
        const res = await request(app)
            .post('/api/v1/setting/rules')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ rules: rulesContent })

        expect(res.status).toBe(200)
        expect(res.body.data.rules).toBe(rulesContent)

        // Verify in DB
        const userInDb = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(userInDb?.rules).toBe(rulesContent)
    })

    it('GET /api/v1/setting/rules - retrieves updated rules', async () => {
        const res = await request(app)
            .get('/api/v1/setting/rules')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.rules).toBe('# Test Rules\n- Rule 1\n- Rule 2')
    })

    it('DELETE /api/v1/setting/rules - removes custom rules', async () => {
        const res = await request(app)
            .delete('/api/v1/setting/rules')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.rules).toBeNull()

        // Verify in DB
        const userInDb = await prisma.user.findUnique({ where: { id: testUserId } })
        expect(userInDb?.rules).toBeNull()
    })
})
