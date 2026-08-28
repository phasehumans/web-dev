export type GetNotifications = {
    userId: string
    page?: number
    limit?: number
    isRead?: boolean
}

export type GetUnreadCount = {
    userId: string
}

export type GetNotificationById = {
    userId: string
    id: string
}

export type MarkAsRead = {
    userId: string
    id: string
}

export type DeleteNotification = {
    userId: string
    id: string
}

export type SendNotificationToUser = {
    userId: string
    title: string
    message: string
    type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
    link?: string
}

export type DeleteAllReadNotification = {
    userId: string
}
