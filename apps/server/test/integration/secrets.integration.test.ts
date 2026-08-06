import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../src/app'

describe('Secrets Module API Endpoints', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string

    beforeAll(async () => {
        testEmail = `secretstest-${Date.now()}@example.com`

        const bcrypt = await import('bcrypt')
        const { env } = await import('../src/env')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'Secrets Test User',
                username: `secretstest_${Date.now()}`,
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
            await prisma.secret.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await prisma.user.delete({ where: { id: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
        }
    })

    it('GET /api/v1/secrets - returns empty array initially', async () => {
        const res = await request(app)
            .get('/api/v1/secrets')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.secrets).toEqual([])
    })

    it('POST /api/v1/secrets - creates a secret', async () => {
        const res = await request(app)
            .post('/api/v1/secrets')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'OPENAI_API_KEY',
                value: 'sk-proj-test12345',
                note: 'Test OpenAI key',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.secret.name).toBe('OPENAI_API_KEY')
        expect(res.body.data.secret.note).toBe('Test OpenAI key')

        // Verify DB value is encrypted and not plain text
        const dbSecret = await prisma.secret.findUnique({
            where: { userId_name: { userId: testUserId, name: 'OPENAI_API_KEY' } },
        })
        expect(dbSecret).not.toBeNull()
        expect(dbSecret?.value).not.toBe('sk-proj-test12345')
        expect(dbSecret?.value).toContain(':')
    })

    it('GET /api/v1/secrets - fetches secrets list', async () => {
        const res = await request(app)
            .get('/api/v1/secrets')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.secrets.length).toBe(1)
        expect(res.body.data.secrets[0].name).toBe('OPENAI_API_KEY')
        expect(res.body.data.secrets[0].note).toBe('Test OpenAI key')
        expect(res.body.data.secrets[0].value).toBeUndefined()
    })

    it('GET /api/v1/secrets/:name/value - decrypts and retrieves secret value', async () => {
        const res = await request(app)
            .get('/api/v1/secrets/OPENAI_API_KEY/value')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.secret.name).toBe('OPENAI_API_KEY')
        expect(res.body.data.secret.value).toBe('sk-proj-test12345')
    })

    it('POST /api/v1/secrets/bulk - imports multiple secrets', async () => {
        const res = await request(app)
            .post('/api/v1/secrets/bulk')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                secrets: [
                    { name: 'ANTHROPIC_API_KEY', value: 'sk-ant-test', note: 'Claude key' },
                    {
                        name: 'DATABASE_URL',
                        value: 'postgres://localhost:5432/db',
                        note: 'DB connection',
                    },
                ],
            })

        expect(res.status).toBe(201)

        const secretsRes = await request(app)
            .get('/api/v1/secrets')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(secretsRes.status).toBe(200)
        expect(secretsRes.body.data.secrets.length).toBe(3)
    })

    it('DELETE /api/v1/secrets/:name - deletes a secret', async () => {
        const res = await request(app)
            .delete('/api/v1/secrets/ANTHROPIC_API_KEY')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)

        const secretsRes = await request(app)
            .get('/api/v1/secrets')
            .set('Authorization', `Bearer ${accessToken}`)

        expect(secretsRes.status).toBe(200)
        expect(secretsRes.body.data.secrets.length).toBe(2)
        const names = secretsRes.body.data.secrets.map((s: { name: string }) => s.name)
        expect(names).not.toContain('ANTHROPIC_API_KEY')
    })
})
