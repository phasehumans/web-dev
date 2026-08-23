import crypto from 'crypto'

import { prisma } from '@december/database'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { env } from '../../src/env'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('GitHubApp Module Integration Tests', () => {
    let testUserId: string
    let testEmail: string
    const testPassword = 'Password123!'
    let accessToken: string

    beforeAll(async () => {
        const timestamp = Date.now()
        testEmail = `ghapp-${timestamp}@example.com`

        const bcrypt = await import('bcrypt')
        const hashedPassword = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                name: 'GitHub App Test User',
                username: `ghapp_${timestamp}`,
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
                refreshTokenHash: `ghapp-hash-${timestamp}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        })

        accessToken = generateAccessToken({ userId: testUserId, sessionId: session.id })
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.githubAppInstallation
                .deleteMany({ where: { userId: testUserId } })
                .catch(() => {
                    // Intentionally swallowed: test cleanup fallback
                })
            await prisma.authSession.deleteMany({ where: { userId: testUserId } }).catch(() => {
                // Intentionally swallowed: test cleanup fallback
            })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. GET /api/v1/githubapp/install-start - unauthorized without token (401)', async () => {
        const res = await request(app)
            .get('/api/v1/githubapp/install-start')
            .set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/githubapp/install-start - redirects to GitHub app installation URL (302)', async () => {
        const res = await request(app)
            .get('/api/v1/githubapp/install-start')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(302)
        expect(res.headers.location).toContain('https://github.com/apps/')
        expect(res.headers.location).toContain('/installations/new')
    })

    it('3. POST /api/v1/githubapp/webhook - rejects request with missing signature (401)', async () => {
        const payload = JSON.stringify({ action: 'created', installation: { id: 9999 } })
        const res = await request(app)
            .post('/api/v1/githubapp/webhook')
            .set('Content-Type', 'application/json')
            .send(payload)

        expect(res.status).toBe(401)
    })

    it('4. POST /api/v1/githubapp/webhook - rejects request with invalid signature (401)', async () => {
        const payload = JSON.stringify({ action: 'created', installation: { id: 9999 } })
        const res = await request(app)
            .post('/api/v1/githubapp/webhook')
            .set('Content-Type', 'application/json')
            .set(
                'x-hub-signature-256',
                'sha256=invalid0000000000000000000000000000000000000000000000000000000000'
            )
            .send(payload)

        expect(res.status).toBe(401)
    })

    it('5. POST /api/v1/githubapp/webhook - processes installation created event (200)', async () => {
        const { githubAppService } = await import('../../src/modules/githubapp/githubapp.service')
        let processInstallCalledWith: any = null
        const originalProcess = githubAppService.processInstallation
        githubAppService.processInstallation = (async (data: any) => {
            processInstallCalledWith = data
            return {} as any
        }) as any

        try {
            const payloadObj = {
                action: 'created',
                installation: { id: 88888 },
            }
            const payloadStr = JSON.stringify(payloadObj)

            const secret = env.GITHUB_APP_WEBHOOK_SECRET || 'secret'
            const hmac = crypto.createHmac('sha256', secret)
            hmac.update(payloadStr)
            const signature = `sha256=${hmac.digest('hex')}`

            const res = await request(app)
                .post('/api/v1/githubapp/webhook')
                .set('Content-Type', 'application/json')
                .set('x-hub-signature-256', signature)
                .set('x-github-event', 'installation')
                .send(payloadStr)

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(processInstallCalledWith).toEqual({ installationId: '88888', userId: 'system' })
        } finally {
            githubAppService.processInstallation = originalProcess
        }
    })

    it('6. POST /api/v1/githubapp/webhook - processes installation deleted event (200)', async () => {
        const { githubAppService } = await import('../../src/modules/githubapp/githubapp.service')
        let processUninstallCalledWith: any = null
        const originalUninstall = githubAppService.processUninstallation
        githubAppService.processUninstallation = (async (data: any) => {
            processUninstallCalledWith = data
            return {} as any
        }) as any

        try {
            const payloadObj = {
                action: 'deleted',
                installation: { id: 88888 },
            }
            const payloadStr = JSON.stringify(payloadObj)

            const secret = env.GITHUB_APP_WEBHOOK_SECRET || 'secret'
            const hmac = crypto.createHmac('sha256', secret)
            hmac.update(payloadStr)
            const signature = `sha256=${hmac.digest('hex')}`

            const res = await request(app)
                .post('/api/v1/githubapp/webhook')
                .set('Content-Type', 'application/json')
                .set('x-hub-signature-256', signature)
                .set('x-github-event', 'installation')
                .send(payloadStr)

            expect(res.status).toBe(200)
            expect(res.body.success).toBe(true)
            expect(processUninstallCalledWith).toEqual({ installationId: '88888' })
        } finally {
            githubAppService.processUninstallation = originalUninstall
        }
    })
})
