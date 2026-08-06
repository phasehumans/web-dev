import { describe, it, expect } from 'bun:test'

import {
    NotificationSchema,
    NotificationParamsSchema,
} from '../../src/modules/notification/notification.schema'

describe('Notification Schema - Unit Tests', () => {
    describe('NotificationSchema', () => {
        it('should pass with valid notification payload', () => {
            const valid = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                userId: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Test Notification',
                message: 'This is a test notification message',
                isRead: false,
                type: 'INFO',
                link: '/dashboard',
                createdAt: new Date(),
            }
            expect(NotificationSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with invalid UUID for id or userId', () => {
            const invalid = {
                id: 'not-a-uuid',
                userId: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Test',
                message: 'Test message',
                isRead: false,
                type: 'INFO',
                link: null,
                createdAt: new Date(),
            }
            const result = NotificationSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })

        it('should fail with invalid notification type', () => {
            const invalid = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                userId: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Test',
                message: 'Test message',
                isRead: false,
                type: 'INVALID_TYPE',
                link: null,
                createdAt: new Date(),
            }
            const result = NotificationSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })

        it('should fail if title or message is empty', () => {
            const invalid = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                userId: '123e4567-e89b-12d3-a456-426614174001',
                title: '',
                message: 'Test message',
                isRead: false,
                type: 'INFO',
                link: null,
                createdAt: new Date(),
            }
            const result = NotificationSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })
    })

    describe('NotificationParamsSchema', () => {
        it('should pass with valid UUID parameter', () => {
            const valid = { id: '123e4567-e89b-12d3-a456-426614174000' }
            expect(NotificationParamsSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with non-UUID string parameter', () => {
            const invalid = { id: 'invalid-id' }
            const result = NotificationParamsSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })
    })
})
