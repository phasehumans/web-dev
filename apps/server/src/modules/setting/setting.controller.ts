import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import {
    changePasswordSchema,
    chatSuggestionsSchema,
    generationSoundSchema,
    updateNameSchema,
    updateNotificationSchema,
    updateUsernameSchema,
    dismissOnboardingCardSchema,
    submitFeedbackSchema,
    updateRulesSchema,
} from './setting.schema'
import { settingService } from './setting.service'

import type { Request, Response } from 'express'

const getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await settingService.getMe({ userId })
    return sendSuccess(res, 'info fetched successfully', result)
})

const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await settingService.getProfile({ userId })
    return sendSuccess(res, 'profile fetched successfully', result)
})

const updateName = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = updateNameSchema.parse(req.body)
    const { name } = parseData

    const result = await settingService.updateName({ userId, name })
    return sendSuccess(res, 'name updated successfully', result)
})

const updateUsername = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = updateUsernameSchema.parse(req.body)
    const { username } = parseData

    const result = await settingService.updateUsername({ userId, username })
    return sendSuccess(res, 'username updated successfully', result)
})

const changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = changePasswordSchema.parse(req.body)
    const { currentPassword, newPassword } = parseData

    const result = await settingService.changePassword({
        userId,
        currentPassword,
        newPassword,
    })
    return sendSuccess(res, 'password changed successfully', result)
})

const updateNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = updateNotificationSchema.parse(req.body)
    const { notifyProjectActivity, notifyProductUpdates, notifySecurityAlerts } = parseData

    const result = await settingService.updateNotifications({
        notifyProjectActivity,
        notifyProductUpdates,
        notifySecurityAlerts,
        userId,
    })
    return sendSuccess(res, 'notifications preferences updated', result)
})

const chatSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = chatSuggestionsSchema.parse(req.body)
    const { chatSuggestions } = parseData

    const result = await settingService.chatSuggestions({ userId, chatSuggestions })
    return sendSuccess(res, 'chat suggestions updated successfully', result)
})

const generationSound = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = generationSoundSchema.parse(req.body)
    const { generationSound } = parseData

    const result = await settingService.generationSound({ userId, generationSound })
    return sendSuccess(res, 'generation sound preference updated successfully', result)
})

const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await settingService.completeOnboarding({ userId })
    return sendSuccess(res, 'onboarding completed successfully', result)
})

const dismissOnboardingCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = dismissOnboardingCardSchema.parse(req.body)
    const { card } = parseData

    const result = await settingService.dismissOnboardingCard({ userId, card })
    return sendSuccess(res, 'onboarding card dismissed successfully', result)
})

const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = submitFeedbackSchema.parse(req.body)
    const { rating, feedback } = parseData

    const result = await settingService.submitFeedback({ userId, rating, feedback })
    return sendSuccess(res, 'feedback submitted successfully', result)
})

const getRules = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await settingService.getRules({ userId })
    return sendSuccess(res, 'rules fetched successfully', result)
})

const updateRules = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const parseData = updateRulesSchema.parse(req.body)
    const { rules } = parseData

    const result = await settingService.updateRules({ userId, rules })
    return sendSuccess(res, 'rules updated successfully', result)
})

const deleteRules = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string | undefined

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    const result = await settingService.deleteRules({ userId })
    return sendSuccess(res, 'rules deleted successfully', result)
})

export const settingController = {
    getMe,
    getProfile,
    updateName,
    updateUsername,
    changePassword,
    updateNotifications,
    chatSuggestions,
    generationSound,
    completeOnboarding,
    dismissOnboardingCard,
    submitFeedback,
    getRules,
    updateRules,
    deleteRules,
}
