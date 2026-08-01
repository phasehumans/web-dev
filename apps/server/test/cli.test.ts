import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import jwt from 'jsonwebtoken'
import request from 'supertest'

import app from '../src/app'
import { env } from '../src/env'

describe('CLI Handoff API Endpoints', () => {
    let testUserId: string
    let testAuthSessionId: string
    let authToken: string

    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                name: 'CLI Handoff Test User',
                email: `cli-test-${Date.now()}@example.com`,
                username: `clitest${Date.now()}`,
            },
        })
        testUserId = user.id

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const session = await prisma.authSession.create({
            data: {
                userId: testUserId,
                refreshTokenHash: `hash-${Date.now()}`,
                expiresAt,
            },
        })
        testAuthSessionId = session.id

        authToken = jwt.sign(
            { userId: testUserId, sessionId: testAuthSessionId },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        )
    })

    afterAll(async () => {
        await prisma.session.deleteMany({ where: { userId: testUserId } })
        await prisma.authSession.deleteMany({ where: { userId: testUserId } })
        await prisma.user.delete({ where: { id: testUserId } })
    })

    it('POST /cli/handoff/complete stores objectKey as minioPrefix on session creation', async () => {
        const testObjectKey = `handoffs/${testUserId}/${Date.now()}-handoff.tar.gz`
        const res = await request(app)
            .post('/api/v1/cli/handoff/complete')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Handoff Test Session',
                messages: [{ role: 'user', content: 'Hello world' }],
                objectKey: testObjectKey,
            })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.id).toBeDefined()
        expect(res.body.data.minioPrefix).toBe(testObjectKey)

        const createdSession = await prisma.session.findUnique({
            where: { id: res.body.data.id },
        })
        expect(createdSession).not.toBeNull()
        expect(createdSession?.minioPrefix).toBe(testObjectKey)
    })
})
