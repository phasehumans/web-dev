import { describe, it, expect } from 'bun:test'

import { notificationRepository } from '../../src/modules/notification/notification.repository'
import { notificationService } from '../../src/modules/notification/notification.service'
import { AppError } from '../../src/shared/appError'

describe('Notification Service - Unit Tests', () => {
    describe('getNotifications', () => {
        it('should return list of notifications for user', async () => {
            const original = notificationRepository.findManyNotifications
            const mockNotifications = [
                {
                    id: 'notif-1',
                    title: 'Welcome',
                    message: 'Hello world',
                    isRead: false,
                    type: 'INFO' as const,
                    link: null,
                    createdAt: new Date(),
                },
            ]
            notificationRepository.findManyNotifications = (async () => mockNotifications) as any

            try {
                const res = await notificationService.getNotifications({ userId: 'user-1' })
                expect(res as any).toEqual(mockNotifications)
            } finally {
                notificationRepository.findManyNotifications = original
            }
        })
    })

    describe('getNotificationById', () => {
        it('should return notification by id', async () => {
            const original = notificationRepository.findNotificationById
            const mockNotification = {
                id: 'notif-1',
                title: 'Welcome',
                message: 'Hello world',
                isRead: false,
                type: 'INFO' as const,
                link: null,
                createdAt: new Date(),
            }
            notificationRepository.findNotificationById = (async () => mockNotification) as any

            try {
                const res = await notificationService.getNotificationById({
                    userId: 'user-1',
                    id: 'notif-1',
                })
                expect(res as any).toEqual(mockNotification)
            } finally {
                notificationRepository.findNotificationById = original
            }
        })
    })

    describe('markAsRead', () => {
        it('should throw AppError 404 if notification not found', async () => {
            const originalFindFirst = notificationRepository.findFirstNotification
            notificationRepository.findFirstNotification = (async () => null) as any

            try {
                await expect(
                    notificationService.markAsRead({ userId: 'user-1', id: 'non-existent' })
                ).rejects.toThrow(new AppError('notification not found', 404))
            } finally {
                notificationRepository.findFirstNotification = originalFindFirst
            }
        })

        it('should update notification read status if exists', async () => {
            const originalFindFirst = notificationRepository.findFirstNotification
            const originalUpdate = notificationRepository.updateNotificationRead

            notificationRepository.findFirstNotification = (async () => ({ id: 'notif-1' })) as any
            notificationRepository.updateNotificationRead = (async () => ({
                id: 'notif-1',
                isRead: true,
            })) as any

            try {
                const res = await notificationService.markAsRead({
                    userId: 'user-1',
                    id: 'notif-1',
                })
                expect(res as any).toEqual({ id: 'notif-1', isRead: true })
            } finally {
                notificationRepository.findFirstNotification = originalFindFirst
                notificationRepository.updateNotificationRead = originalUpdate
            }
        })
    })

    describe('deleteNotification', () => {
        it('should throw AppError 404 if notification to delete does not exist', async () => {
            const originalFindFirst = notificationRepository.findFirstNotification
            notificationRepository.findFirstNotification = (async () => null) as any

            try {
                await expect(
                    notificationService.deleteNotification({ userId: 'user-1', id: 'notif-999' })
                ).rejects.toThrow(new AppError('notification not found', 404))
            } finally {
                notificationRepository.findFirstNotification = originalFindFirst
            }
        })

        it('should delete notification if exists', async () => {
            const originalFindFirst = notificationRepository.findFirstNotification
            const originalDelete = notificationRepository.deleteNotification

            notificationRepository.findFirstNotification = (async () => ({ id: 'notif-1' })) as any
            notificationRepository.deleteNotification = (async () => ({ id: 'notif-1' })) as any

            try {
                const res = await notificationService.deleteNotification({
                    userId: 'user-1',
                    id: 'notif-1',
                })
                expect(res as any).toEqual({ id: 'notif-1' })
            } finally {
                notificationRepository.findFirstNotification = originalFindFirst
                notificationRepository.deleteNotification = originalDelete
            }
        })
    })

    describe('sendNotificationToUser', () => {
        it('should create a notification with default type INFO', async () => {
            const originalCreate = notificationRepository.createNotification
            let createdPayload: any = null

            notificationRepository.createNotification = (async (data: any) => {
                createdPayload = data
                return { id: 'notif-new', ...data }
            }) as any

            try {
                const res = await notificationService.sendNotificationToUser({
                    userId: 'user-1',
                    title: 'Alert',
                    message: 'System notification',
                })

                expect(createdPayload.type).toBe('INFO')
                expect(res.title).toBe('Alert')
            } finally {
                notificationRepository.createNotification = originalCreate
            }
        })
    })

    describe('deleteAllReadNotification', () => {
        it('should delete all read notifications for a user', async () => {
            const originalDeleteMany = notificationRepository.deleteManyReadNotifications
            notificationRepository.deleteManyReadNotifications = (async (userId: string) => ({
                count: 3,
            })) as any

            try {
                const res = await notificationService.deleteAllReadNotification({
                    userId: 'user-1',
                })
                expect(res).toEqual({ count: 3 })
            } finally {
                notificationRepository.deleteManyReadNotifications = originalDeleteMany
            }
        })
    })
})
