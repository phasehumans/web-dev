import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import { notificationController } from './notification.controller'

const notificationRouter = Router()

notificationRouter.use(authMiddleware)

notificationRouter.get('/', notificationController.getNotifications)
notificationRouter.get('/:id', notificationController.getNotificationById)
notificationRouter.patch('/:id/read', notificationController.markAsRead)
notificationRouter.delete('/', notificationController.deleteAllReadNotification)
notificationRouter.delete('/:id', notificationController.deleteNotification)

export default notificationRouter
