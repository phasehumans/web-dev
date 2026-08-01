import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import { settingController } from './setting.controller'

const settingRouter = Router()

settingRouter.use(authMiddleware)

settingRouter.get('/me', settingController.getMe)
settingRouter.get('/', settingController.getProfile)
settingRouter.patch('/name', settingController.updateName)
settingRouter.patch('/username', settingController.updateUsername)
settingRouter.patch('/password', settingController.changePassword)
settingRouter.patch('/notifications', settingController.updateNotifications)
settingRouter.patch('/onboarding', settingController.completeOnboarding)
settingRouter.post('/onboarding/dismiss', settingController.dismissOnboardingCard)

settingRouter.post('/suggestions', settingController.chatSuggestions)
settingRouter.post('/sound', settingController.generationSound)
settingRouter.post('/feedback', settingController.submitFeedback)

settingRouter.get('/rules', settingController.getRules)
settingRouter.post('/rules', settingController.updateRules)
settingRouter.delete('/rules', settingController.deleteRules)

export default settingRouter
