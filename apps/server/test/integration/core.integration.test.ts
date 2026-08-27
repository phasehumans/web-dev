import { prisma } from '@december/database'
import { getAgentQueue } from '@december/shared'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import jwt from 'jsonwebtoken'
import request from 'supertest'

import app from '../../src/app'
import { env } from '../../src/env'

describe('Core Prompt Extensive Integration Tests', () => {
    let userAId: string
    let userAAuthToken: string
    let userBCookie: string

    let userBId: string
    let userBAuthToken: string

    beforeAll(async () => {
        // Create User A
        const userA = await prisma.user.create({
            data: {
                name: 'Core User A',
                email: `core-user-a-${Date.now()}@example.com`,
                username: `coreusera${Date.now()}`,
            },
        })
        userAId = userA.id

        const sessionA = await prisma.authSession.create({
            data: {
                userId: userAId,
                refreshTokenHash: `core-hash-a-${Date.now()}`,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        })

        userAAuthToken = jwt.sign(
            { userId: userAId, sessionId: sessionA.id },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        )

        // Create User B
        const userB = await prisma.user.create({
            data: {
                name: 'Core User B',
                email: `core-user-b-${Date.now()}@example.com`,
                username: `coreuserb${Date.now()}`,
            },
        })
        userBId = userB.id

        const sessionB = await prisma.authSession.create({
            data: {
                userId: userBId,
                refreshTokenHash: `core-hash-b-${Date.now()}`,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        })

        userBAuthToken = jwt.sign(
            { userId: userBId, sessionId: sessionB.id },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        )
        userBCookie = `accessToken=${userBAuthToken}`
    })

    afterAll(async () => {
        const userIds = [userAId, userBId]
        await prisma.message.deleteMany({
            where: { session: { userId: { in: userIds } } },
        })
        await prisma.sessionCollaborator.deleteMany({
            where: { userId: { in: userIds } },
        })
        await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
        await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } })
        await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    })

    describe('Authentication & Authorization Checks', () => {
        it('POST /api/v1/core/prompt - 401 Unauthorized if missing token and cookie', async () => {
            const res = await request(app).post('/api/v1/core/prompt').send({
                prompt: 'Unauthenticated prompt',
            })

            expect(res.status).toBe(401)
            expect(res.body.success).toBe(false)
        })

        it('POST /api/v1/core/prompt - 401 Unauthorized with invalid or tampered JWT', async () => {
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', 'Bearer invalid.jwt.token')
                .send({
                    prompt: 'Tampered token test',
                })

            expect(res.status).toBe(401)
            expect(res.body.success).toBe(false)
        })

        it('POST /api/v1/core/prompt - 200 OK using cookie authentication (accessToken)', async () => {
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Cookie', [userBCookie])
                .send({
                    prompt: 'Cookie authenticated prompt',
                })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.data.sessionId).toBeDefined()
        })
    })

    describe('Schema Validation', () => {
        it('POST /api/v1/core/prompt - 400 Bad Request if prompt is empty string', async () => {
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userAAuthToken}`)
                .send({
                    prompt: '   '.trim(), // resolves to empty string
                })

            expect(res.status).toBe(400)
            expect(res.body.success).toBe(false)
        })

        it('POST /api/v1/core/prompt - 400 Bad Request if prompt field is missing entirely', async () => {
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userAAuthToken}`)
                .send({
                    projectId: 'proj-1',
                })

            expect(res.status).toBe(400)
            expect(res.body.success).toBe(false)
        })
    })

    describe('Prompt Execution & Session Management', () => {
        it('POST /api/v1/core/prompt - Auto-creates session & initial message when sessionId omitted', async () => {
            const promptText = 'Create a new dashboard component for analytics'
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userAAuthToken}`)
                .send({
                    prompt: promptText,
                })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.data.jobId).toBeDefined()
            expect(res.body.data.sessionId).toBeDefined()

            const createdSession = await prisma.session.findUnique({
                where: { id: res.body.data.sessionId },
                include: { messages: true },
            })

            expect(createdSession).not.toBeNull()
            expect(createdSession?.userId).toBe(userAId)
            expect(createdSession?.title).toBe(promptText.slice(0, 50))
            expect(createdSession?.type).toBe('WEB')
            expect(createdSession?.messages.length).toBe(1)
            expect(createdSession?.messages?.[0]?.role).toBe('USER')
            expect(createdSession?.messages?.[0]?.content).toBe(promptText)
        })

        it('POST /api/v1/core/prompt - Uses existing session when valid sessionId provided', async () => {
            const existingSession = await prisma.session.create({
                data: {
                    userId: userAId,
                    title: 'User A Active Session',
                    type: 'WEB',
                },
            })

            const promptText = 'Refactor current component state'
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userAAuthToken}`)
                .send({
                    prompt: promptText,
                    sessionId: existingSession.id,
                })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.data.sessionId).toBe(existingSession.id)
            expect(res.body.data.jobId).toBeDefined()
        })

        it('POST /api/v1/core/prompt - 404 Not Found if User B tries to prompt User A private session', async () => {
            const privateSession = await prisma.session.create({
                data: {
                    userId: userAId,
                    title: 'User A Private Session',
                    type: 'WEB',
                },
            })

            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userBAuthToken}`)
                .send({
                    prompt: 'Attempt unauthorized access',
                    sessionId: privateSession.id,
                })

            expect(res.status).toBe(404)
            expect(res.body.success).toBe(false)
            expect(res.body.message).toBe('Session not found')
        })

        it('POST /api/v1/core/prompt - 200 OK if User B is added as collaborator to User A session', async () => {
            const sharedSession = await prisma.session.create({
                data: {
                    userId: userAId,
                    title: 'User A & B Shared Session',
                    type: 'WEB',
                },
            })

            await prisma.sessionCollaborator.create({
                data: {
                    sessionId: sharedSession.id,
                    userId: userBId,
                    email: `core-user-b-${Date.now()}@example.com`,
                },
            })

            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userBAuthToken}`)
                .send({
                    prompt: 'Collaborator prompt update',
                    sessionId: sharedSession.id,
                })

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(res.body.data.sessionId).toBe(sharedSession.id)
        })

        it('POST /api/v1/core/prompt - Verifies BullMQ queue contains the enqueued job', async () => {
            const promptText = 'Enqueue test for BullMQ Redis'
            const res = await request(app)
                .post('/api/v1/core/prompt')
                .set('Authorization', `Bearer ${userAAuthToken}`)
                .send({
                    prompt: promptText,
                })

            expect(res.status).toBe(200)
            const { jobId, sessionId } = res.body.data

            const queue = getAgentQueue()
            const job = await queue.getJob(jobId)

            expect(job).not.toBeNull()
            if (job) {
                expect(job.name).toBe('prompt_job')
                expect(job.data.prompt).toBe(promptText)
                expect(job.data.sessionId).toBe(sessionId)
                expect(job.data.userId).toBe(userAId)
            }
        })
    })
})
