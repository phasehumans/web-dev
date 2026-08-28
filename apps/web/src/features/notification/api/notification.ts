import { apiRequest } from '@/shared/api/client'

export interface Notification {
    id: string
    userId: string
    title: string
    message: string
    isRead: boolean
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
    link: string | null
    createdAt: string
}

export interface PaginatedNotificationsResponse {
    notifications: Notification[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

const getNotifications = (params?: { page?: number; limit?: number; isRead?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.page) query.set('page', params.page.toString())
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.isRead !== undefined) query.set('isRead', params.isRead.toString())
    const qs = query.toString()
    return apiRequest<PaginatedNotificationsResponse>(`/notification${qs ? `?${qs}` : ''}`)
}

const getUnreadCount = () => {
    return apiRequest<{ count: number }>('/notification/unread-count')
}

const getNotificationById = (id: string) => {
    return apiRequest<Notification>(`/notification/${id}`)
}

const markAsRead = (id: string) => {
    return apiRequest<Notification>(`/notification/${id}/read`, {
        method: 'PATCH',
    })
}

const deleteNotification = (id: string) => {
    return apiRequest<void>(`/notification/${id}`, {
        method: 'DELETE',
    })
}

const deleteAllRead = () => {
    return apiRequest<void>('/notification', {
        method: 'DELETE',
    })
}

const deleteAll = () => {
    return apiRequest<void>('/notification', {
        method: 'DELETE',
    })
}

export const notificationAPI = {
    getNotifications,
    getUnreadCount,
    getNotificationById,
    markAsRead,
    deleteNotification,
    deleteAllRead,
    deleteAll,
}
