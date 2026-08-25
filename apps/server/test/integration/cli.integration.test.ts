import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll, spyOn } from 'bun:test'
import jwt from 'jsonwebtoken'
import request from 'supertest'

import app from '../../src/app'
import { env } from '../../src/env'
import { cliDispatcher } from '../../src/modules/cli/cli.dispatcher'

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

    it('GET /cli/handoff/upload-url returns presigned uploadUrl and objectKey inside data', async () => {
        const res = await request(app)
            .get('/api/v1/cli/handoff/upload-url')
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.uploadUrl).toBeDefined()
        expect(res.body.data.objectKey).toBeDefined()
        expect(res.body.data.objectKey).toContain(`handoffs/${testUserId}/`)
    })

    it('GET /cli/handoff/upload-url returns 402 when user has insufficient wallet credits', async () => {
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 0 },
        })

        const res = await request(app)
            .get('/api/v1/cli/handoff/upload-url')
            .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(402)
        expect(res.body.message).toContain('Insufficient credits in December Wallet')
        expect(res.body.message).toContain('https://trydecember.com/settings/billing')

        // Restore credits for subsequent tests
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 100 },
        })
    })

    it('POST /cli/chat/completions rejects request with invalid body schema', async () => {
        const res = await request(app)
            .post('/api/v1/cli/chat/completions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                messages: [], // empty messages array should fail Zod validation
            })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('POST /cli/chat/completions returns 402 when user has insufficient wallet credits', async () => {
        // Ensure user has 0 credit balance
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 0 },
        })

        const res = await request(app)
            .post('/api/v1/cli/chat/completions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                model: 'gemini-3.6-flash',
                messages: [{ role: 'user', content: 'hello' }],
            })

        expect(res.status).toBe(402)
        expect(res.body.message).toContain('Insufficient credits in December Wallet')
        expect(res.body.message).toContain('https://trydecember.com/settings/billing')
        expect(res.body.message).toContain('Bring Your Own Key (BYOK)')
    })

    it('POST /cli/chat/completions streams SSE response when user has balance and valid payload', async () => {
        // Give user credits
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 100 },
        })

        const mockProvider = {
            id: 'gemini',
            name: 'Gemini',
            stream: async function* () {
                yield { type: 'thinking_delta', text: 'Thinking about tools...' }
                yield {
                    type: 'tool_call_delta',
                    id: JSON.stringify({ id: 'call_1', thoughtSignature: 'sig_123' }),
                    name: 'write_file',
                    inputDelta: '{"path":"/workspace/TASK.md"}',
                }
                yield { type: 'usage', promptTokens: 15, completionTokens: 25 }
            },
        }

        const resolveSpy = spyOn(cliDispatcher, 'resolveServerProvider').mockReturnValue({
            provider: mockProvider as any,
            providerName: 'gemini',
            model: 'gemini-3.6-flash',
        })

        const res = await request(app)
            .post('/api/v1/cli/chat/completions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                model: 'gemini-3.6-flash',
                messages: [{ role: 'user', content: 'hi' }],
            })

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('text/event-stream')
        expect(res.text).toContain('Thinking about tools...')
        expect(res.text).toContain('write_file')
        expect(res.text).toContain('data: [DONE]')

        resolveSpy.mockRestore()
    })

    it('POST /cli/handoff/complete returns 402 when user has insufficient wallet credits', async () => {
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 0 },
        })

        const res = await request(app)
            .post('/api/v1/cli/handoff/complete')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Handoff Test Session',
                messages: [{ role: 'user', content: 'Hello world' }],
                objectKey: `handoffs/${testUserId}/${Date.now()}-handoff.tar.gz`,
            })

        expect(res.status).toBe(402)
        expect(res.body.message).toContain('Insufficient credits in December Wallet')
        expect(res.body.message).toContain('https://trydecember.com/settings/billing')

        // Restore credits for subsequent tests
        await prisma.user.update({
            where: { id: testUserId },
            data: { creditBalance: 100 },
        })
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
