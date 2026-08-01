import { GenerationSound as GenerationSoundEnum } from './setting.schema'

export type GetMe = {
    userId: string
}

export type GetProfile = {
    userId: string
}

export type UpdateName = {
    userId: string
    name: string
}

export type UpdateUsername = {
    userId: string
    username: string
}

export type ChangePassword = {
    userId: string
    currentPassword?: string
    newPassword: string
}

export type UpdateNotifications = {
    userId: string
    notifyProjectActivity?: boolean
    notifyProductUpdates?: boolean
    notifySecurityAlerts?: boolean
}

export type ChatSuggestions = {
    userId: string
    chatSuggestions: boolean
}

export type UpdateGenerationSoundPayload = {
    userId: string
    generationSound: GenerationSoundEnum
}

export type CompleteOnboarding = {
    userId: string
}

export type DismissOnboardingCard = {
    userId: string
    card: 'welcome' | 'github' | 'feedback'
}

export type SubmitFeedback = {
    userId: string
    rating: 'sad' | 'neutral' | 'happy' | null
    feedback: string
}

export type GetRules = {
    userId: string
}

export type UpdateRules = {
    userId: string
    rules: string
}

export type DeleteRules = {
    userId: string
}
