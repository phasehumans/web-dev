import { prisma } from '@december/database'
import { describe, it, expect, afterAll, beforeAll, spyOn } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { cliDispatcher } from '../../src/modules/cli/cli.dispatcher'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Search Mode Integration Tests (#454, #455, #457)', () => {
    const userEmail = `searchtest-${Date.now()}@example.com`
    const brokeUserEmail = `searchbroke-${Date.now()}@example.com`
    const password = 'Password123!'

    let userId: string
    let brokeUserId: string
    let userToken: string
    let brokeUserToken: string
    let searchSessionId: string
    let resolveSpy: any

    beforeAll(async () => {
        const mockProvider = {
            id: 'gemini',
            name: 'Gemini',
            stream: async function* (messages: any[]) {
                yield { type: 'thinking_delta', text: 'Analyzing search query...' }
                const lastMsg = messages[messages.length - 1]?.content || ''
                if (lastMsg.includes('React Hooks')) {
                    yield {
                        type: 'text',
                        text: '- Hooks allow using state without classes.\n- useEffect handles lifecycle effects.',
                    }
                } else if (lastMsg.includes('useEffect')) {
                    yield {
                        type: 'text',
                        text: 'useEffect cleans up by returning a function from the effect callback.',
                    }
                } else {
                    yield {
                        type: 'text',
                        text: 'Here is the search response.',
                    }
                }
                yield { type: 'usage', promptTokens: 20, completionTokens: 40 }
            },
        }

        resolveSpy = spyOn(cliDispatcher, 'resolveServerProvider').mockReturnValue({
            provider: mockProvider as any,
            providerName: 'gemini',
            model: 'gemini-3.6-flash',
        })
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)

        const timestamp = Date.now()
        // Create User with credits
        const u = await prisma.user.create({
            data: {
                email: userEmail,
                name: 'Search Test User',
                username: `searchuser_${timestamp}`,
                password: passHash,
                emailVerified: true,
                creditBalance: 500, // 500 cents ($5.00)
            },
        })
        userId = u.id

        // Create Broke User with 0 credits
        const bu = await prisma.user.create({
            data: {
                email: brokeUserEmail,
                name: 'Broke Search User',
                username: `searchbroke_${timestamp}`,
                password: passHash,
                emailVerified: true,
                creditBalance: 0,
            },
        })
        brokeUserId = bu.id

        // Login User 1
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: userEmail, password })
        userToken = loginRes.body.data.accessToken

        // Login Broke User
        const brokeLoginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: brokeUserEmail, password })
        brokeUserToken = brokeLoginRes.body.data.accessToken
    })

    afterAll(async () => {
        resolveSpy?.mockRestore()
        if (searchSessionId) {
            await prisma.usageEvent.deleteMany({ where: { sessionId: searchSessionId } })
            await prisma.message.deleteMany({ where: { sessionId: searchSessionId } })
            await prisma.session.deleteMany({ where: { id: searchSessionId } })
        }
        if (userId) {
            await cleanupTestUser({ id: userId })
        }
        if (brokeUserId) {
            await cleanupTestUser({ id: brokeUserId })
        }
    })

    it('1. POST /api/v1/session - creates SEARCH session bypassing VM sandbox (#454)', async () => {
        const res = await request(app)
            .post('/api/v1/session')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'What is TypeScript?',
                type: 'SEARCH',
            })

        expect(res.status).toBe(201)
        expect(res.body.data.session).toBeDefined()
        expect(res.body.data.session.type).toBe('SEARCH')
        expect(res.body.data.session.vmStatus).toBe('STOPPED')
        expect(res.body.data.session.vmId).toBeNull()

        searchSessionId = res.body.data.session.id
    })

    it('2. POST /api/v1/session/:id/search/stream - 401 when unauthenticated (#454)', async () => {
        const res = await request(app)
            .post(`/api/v1/session/${searchSessionId}/search/stream`)
            .set('x-forwarded-for', getRandomIP())
            .send({ prompt: 'Tell me about interfaces' })

        expect(res.status).toBe(401)
    })

    it('3. POST /api/v1/session/:id/search/stream - 402 when user has insufficient credits (#457)', async () => {
        // Create session for broke user
        const sRes = await prisma.session.create({
            data: {
                userId: brokeUserId,
                title: 'Broke Session',
                type: 'SEARCH',
                vmStatus: 'STOPPED',
            },
        })

        const res = await request(app)
            .post(`/api/v1/session/${sRes.id}/search/stream`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${brokeUserToken}`)
            .send({ prompt: 'Can I search for free?' })

        expect(res.status).toBe(402)
        expect(res.body.message).toContain('Insufficient credits')

        await prisma.session.delete({ where: { id: sRes.id } })
    })

    it('4. POST /api/v1/session/:id/search/stream - streams SSE events and saves messages (#454, #455)', async () => {
        const promptText = 'Explain React Hooks in 2 bullet points.'

        const res = await request(app)
            .post(`/api/v1/session/${searchSessionId}/search/stream`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userToken}`)
            .send({ prompt: promptText })

        expect(res.status).toBe(200)
        expect(res.headers['content-type']).toContain('text/event-stream')
        expect(res.headers['cache-control']).toContain('no-cache')
        expect(res.text).toContain('event: token')
        expect(res.text).toContain('event: done')

        // Verify messages in database
        const messages = await prisma.message.findMany({
            where: { sessionId: searchSessionId },
            orderBy: { sequence: 'asc' },
        })

        expect(messages.length).toBe(2)
        expect(messages[0].role).toBe('USER')
        expect(messages[0].content).toBe(promptText)
        expect(messages[0].sequence).toBe(1)

        expect(messages[1].role).toBe('ASSISTANT')
        expect(messages[1].content.length).toBeGreaterThan(0)
        expect(messages[1].sequence).toBe(2)
    })

    it('5. POST /api/v1/session/:id/search/stream - multi-turn turn 2 persists sequence 3 and 4 (#455)', async () => {
        const followUpPrompt = 'How does useEffect clean up?'

        const res = await request(app)
            .post(`/api/v1/session/${searchSessionId}/search/stream`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userToken}`)
            .send({ prompt: followUpPrompt })

        expect(res.status).toBe(200)
        expect(res.text).toContain('event: token')
        expect(res.text).toContain('event: done')

        // Verify all 4 messages in sequence
        const messages = await prisma.message.findMany({
            where: { sessionId: searchSessionId },
            orderBy: { sequence: 'asc' },
        })

        expect(messages.length).toBe(4)
        expect(messages[2].role).toBe('USER')
        expect(messages[2].content).toBe(followUpPrompt)
        expect(messages[2].sequence).toBe(3)

        expect(messages[3].role).toBe('ASSISTANT')
        expect(messages[3].sequence).toBe(4)
    })

    it('6. GET /api/v1/session/:id - returns complete multi-turn history (#455)', async () => {
        const res = await request(app)
            .get(`/api/v1/session/${searchSessionId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.session.type).toBe('SEARCH')
        expect(res.body.data.chatMessages).toBeArray()
        expect(res.body.data.chatMessages.length).toBe(4)
        expect(res.body.data.chatMessages[0].sequence).toBe(1)
        expect(res.body.data.chatMessages[1].sequence).toBe(2)
        expect(res.body.data.chatMessages[2].sequence).toBe(3)
        expect(res.body.data.chatMessages[3].sequence).toBe(4)
    })

    it('7. Token billing and usage tracking recorded in database (#457)', async () => {
        const usageEvents = await prisma.usageEvent.findMany({
            where: { sessionId: searchSessionId },
        })

        expect(usageEvents.length).toBeGreaterThanOrEqual(2)
        const event = usageEvents[0]
        expect(event.userId).toBe(userId)
        expect(event.sessionId).toBe(searchSessionId)
        expect(event.totalTokens).toBeGreaterThan(0)
        expect(event.costInCents).toBeGreaterThan(0)

        // Check user credit balance was decremented
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
        })
        expect(updatedUser?.creditBalance).toBeLessThan(500)
    })

    it('8. GET /api/v1/session?type=SEARCH - lists search sessions (#455)', async () => {
        const res = await request(app)
            .get('/api/v1/session?type=SEARCH')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${userToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.sessions).toBeArray()
        expect(res.body.data.sessions.some((s: any) => s.id === searchSessionId)).toBe(true)
    })
})
