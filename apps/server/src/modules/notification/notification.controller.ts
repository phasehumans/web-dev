import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { NotificationParamsSchema } from './notification.schema'
import { notificationService } from './notification.service'

import type { Request, Response } from 'express'

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await notificationService.getNotifications({ userId })
    return sendSuccess(res, 'notifications fetched successfully', result)
})

const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedParams = NotificationParamsSchema.parse(req.params)
    const { id } = parsedParams

    const notification = await notificationService.getNotificationById({ userId, id })

    if (!notification) {
        throw new AppError('notification not found', 404)
    }

    // mark as read when fetched in detail
    if (!notification.isRead) {
        await notificationService.markAsRead({ userId, id })
        notification.isRead = true
    }

    return sendSuccess(res, 'notification fetched successfully', notification)
})

const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedParams = NotificationParamsSchema.parse(req.params)
    const { id } = parsedParams

    const result = await notificationService.markAsRead({ userId, id })
    return sendSuccess(res, 'notification marked as read', result)
})

const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parsedParams = NotificationParamsSchema.parse(req.params)
    const { id } = parsedParams

    await notificationService.deleteNotification({ userId, id })
    return sendSuccess(res, 'notification deleted successfully', null)
})

const deleteAllReadNotification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    await notificationService.deleteAllReadNotification({ userId })
    return sendSuccess(res, 'read notifications deleted successfully', null)
})

export const notificationController = {
    getNotifications,
    getNotificationById,
    markAsRead,
    deleteNotification,
    deleteAllReadNotification,
}
