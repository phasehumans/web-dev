import { AppError } from '../../shared/appError'

import { notificationRepository } from './notification.repository'

export const notificationSelect = {
    id: true,
    title: true,
    message: true,
    isRead: true,
    type: true,
    link: true,
    createdAt: true,
}

import type {
    GetNotifications,
    GetNotificationById,
    MarkAsRead,
    DeleteNotification,
    SendNotificationToUser,
    DeleteAllReadNotification,
} from './notification.types'

const getNotifications = async (data: GetNotifications) => {
    const { userId } = data
    return notificationRepository.findManyNotifications({
        userId,
        select: notificationSelect,
    })
}

const getNotificationById = async (data: GetNotificationById) => {
    const { userId, id } = data
    return notificationRepository.findNotificationById({
        userId,
        id,
        select: notificationSelect,
    })
}

const markAsRead = async (data: MarkAsRead) => {
    const { userId, id } = data
    const existing = await notificationRepository.findFirstNotification({
        userId,
        id,
        select: {
            id: true,
        },
    })

    if (!existing) {
        throw new AppError('notification not found', 404)
    }

    return notificationRepository.updateNotificationRead({
        userId,
        id,
        select: notificationSelect,
    })
}

const deleteNotification = async (data: DeleteNotification) => {
    const { userId, id } = data
    const existing = await notificationRepository.findFirstNotification({
        userId,
        id,
        select: {
            id: true,
        },
    })

    if (!existing) {
        throw new AppError('notification not found', 404)
    }

    return notificationRepository.deleteNotification({
        userId,
        id,
        select: notificationSelect,
    })
}

const sendNotificationToUser = async (data: SendNotificationToUser) => {
    const { userId, title, message, type = 'INFO', link } = data
    return notificationRepository.createNotification({
        userId,
        title,
        message,
        type,
        link,
        select: notificationSelect,
    })
}

const deleteAllReadNotification = async (data: DeleteAllReadNotification) => {
    const { userId } = data
    return notificationRepository.deleteManyReadNotifications(userId)
}

export const notificationService = {
    getNotifications,
    getNotificationById,
    markAsRead,
    deleteNotification,
    sendNotificationToUser,
    deleteAllReadNotification,
}
