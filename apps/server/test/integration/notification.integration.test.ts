import { prisma } from '@december/database'
import { describe, it, expect, afterAll, beforeAll } from 'bun:test'
import request from 'supertest'

import app from '../../src/app'
import { notificationService } from '../../src/modules/notification/notification.service'
import { cleanupTestUser, getRandomIP } from '../helpers'

describe('Notification Integration Tests', () => {
    const testEmail = `notiftest-${Date.now()}@example.com`
    const testPassword = 'Password123!'
    let testUserId: string
    let accessToken: string
    let notif1Id: string
    let notif2Id: string

    beforeAll(async () => {
        const bcrypt = await import('bcrypt')
        const { env } = await import('../../src/env')
        const passHash = await bcrypt.hash(testPassword, env.BCRYPT_SALT_ROUNDS)

        const user = await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Notif Test User',
                username: `notifuser-${Date.now()}`,
                password: passHash,
                emailVerified: true,
            },
        })
        testUserId = user.id

        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .set('x-forwarded-for', getRandomIP())
            .send({ email: testEmail, password: testPassword })

        accessToken = loginRes.body.data.accessToken

        // Seed notifications
        const n1 = await notificationService.sendNotificationToUser({
            userId: testUserId,
            title: 'Welcome Notification',
            message: 'First test notification message',
            type: 'INFO',
        })
        notif1Id = n1.id

        const n2 = await notificationService.sendNotificationToUser({
            userId: testUserId,
            title: 'System Update',
            message: 'Second test notification message',
            type: 'SUCCESS',
            link: '/settings',
        })
        notif2Id = n2.id
    })

    afterAll(async () => {
        if (testUserId) {
            await prisma.notification.deleteMany({ where: { userId: testUserId } })
            await cleanupTestUser({ id: testUserId })
        }
    })

    it('1. GET /api/v1/notification - unauthorized without token (401)', async () => {
        const res = await request(app)
            .get('/api/v1/notification')
            .set('x-forwarded-for', getRandomIP())

        expect(res.status).toBe(401)
    })

    it('2. GET /api/v1/notification - returns paginated notifications for user', async () => {
        const res = await request(app)
            .get('/api/v1/notification?page=1&limit=10')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.notifications).toBeArray()
        expect(res.body.data.pagination).toBeDefined()
        expect(res.body.data.pagination.page).toBe(1)
        expect(res.body.data.pagination.limit).toBe(10)
        expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(2)
        const ids = res.body.data.notifications.map((n: any) => n.id)
        expect(ids).toContain(notif1Id)
        expect(ids).toContain(notif2Id)
    })

    it('2b. GET /api/v1/notification/unread-count - returns unread count', async () => {
        const res = await request(app)
            .get('/api/v1/notification/unread-count')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.count).toBeGreaterThanOrEqual(2)
    })

    it('3. GET /api/v1/notification/:id - fetches detail and auto-marks as read', async () => {
        const res = await request(app)
            .get(`/api/v1/notification/${notif1Id}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.id).toBe(notif1Id)
        expect(res.body.data.isRead).toBe(true)

        // Verify DB update
        const dbNotif = await prisma.notification.findUnique({ where: { id: notif1Id } })
        expect(dbNotif?.isRead).toBe(true)
    })

    it('4. PATCH /api/v1/notification/:id/read - explicitly marks notification as read', async () => {
        const res = await request(app)
            .patch(`/api/v1/notification/${notif2Id}/read`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)
        expect(res.body.data.isRead).toBe(true)
    })

    it('5. DELETE /api/v1/notification/:id - deletes individual notification', async () => {
        const res = await request(app)
            .delete(`/api/v1/notification/${notif1Id}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)

        // Verify deletion from DB
        const dbNotif = await prisma.notification.findUnique({ where: { id: notif1Id } })
        expect(dbNotif).toBeNull()
    })

    it('6. DELETE /api/v1/notification - deletes all read notifications', async () => {
        const res = await request(app)
            .delete('/api/v1/notification')
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(200)

        // Verify remaining read notifications for user is 0
        const remainingRead = await prisma.notification.count({
            where: { userId: testUserId, isRead: true },
        })
        expect(remainingRead).toBe(0)
    })

    it('7. GET /api/v1/notification/:id - returns 404 for non-existent notification', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000'
        const res = await request(app)
            .get(`/api/v1/notification/${nonExistentId}`)
            .set('x-forwarded-for', getRandomIP())
            .set('Authorization', `Bearer ${accessToken}`)

        expect(res.status).toBe(404)
    })
})
