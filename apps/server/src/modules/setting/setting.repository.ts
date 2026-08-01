import { prisma } from '@december/database'

import type { Prisma } from '@december/database'

async function findUserByIdForInfo(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            name: true,
            githubConnected: true,
        },
    })
}

async function findUserByIdForProfile(id: string, selectFields: Prisma.UserSelect) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            ...selectFields,
            password: true,
        },
    })
}

async function findUserByIdForExistCheck(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
        },
    })
}

async function findUserByIdForUsernameCheck(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            username: true,
        },
    })
}

async function findUserByUsername(username: string) {
    return prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
        },
    })
}

async function updateUserName(id: string, name: string) {
    return prisma.user.update({
        where: { id },
        data: { name },
        select: {
            name: true,
        },
    })
}

async function updateUsername(id: string, username: string) {
    return prisma.user.update({
        where: { id },
        data: { username },
        select: {
            username: true,
        },
    })
}

async function findUserPasswordById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            password: true,
        },
    })
}

async function updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
        where: { id },
        data: { password: passwordHash },
        select: {
            id: true,
        },
    })
}

async function updateNotifications(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
        where: { id },
        data,
        select: {
            notifyProjectActivity: true,
            notifyProductUpdates: true,
            notifySecurityAlerts: true,
        },
    })
}

async function findUserByIdForChatSuggestions(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            chatSuggestions: true,
        },
    })
}

async function updateChatSuggestions(id: string, chatSuggestions: boolean) {
    return prisma.user.update({
        where: { id },
        data: { chatSuggestions },
        select: {
            chatSuggestions: true,
        },
    })
}

async function findUserByIdForGenerationSound(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            generationSound: true,
        },
    })
}

async function updateGenerationSound(
    id: string,
    generationSound: Prisma.UserUpdateInput['generationSound']
) {
    return prisma.user.update({
        where: { id },
        data: { generationSound },
        select: {
            generationSound: true,
        },
    })
}

async function updateCompleteOnboarding(id: string) {
    return prisma.user.update({
        where: { id },
        data: { hasCompletedOnboarding: true },
        select: {
            id: true,
            hasCompletedOnboarding: true,
        },
    })
}

async function updateWelcomeCardDone(id: string) {
    return prisma.user.update({
        where: { id },
        data: { welcomeCardDone: true },
        select: {
            id: true,
            welcomeCardDone: true,
        },
    })
}

async function updateGithubCardDone(id: string) {
    return prisma.user.update({
        where: { id },
        data: { githubCardDone: true },
        select: {
            id: true,
            githubCardDone: true,
        },
    })
}

async function updateFeedbackCardDone(id: string) {
    return prisma.user.update({
        where: { id },
        data: { feedbackCardDone: true },
        select: {
            id: true,
            feedbackCardDone: true,
        },
    })
}

async function createFeedback(userId: string, rating: string | null, feedback: string) {
    return prisma.feedback.create({
        data: {
            userId,
            rating,
            feedback,
        },
    })
}

async function findUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            name: true,
        },
    })
}

async function findUserRules(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            rules: true,
        },
    })
}

async function updateUserRules(id: string, rules: string) {
    return prisma.user.update({
        where: { id },
        data: { rules },
        select: {
            rules: true,
        },
    })
}

async function deleteUserRules(id: string) {
    return prisma.user.update({
        where: { id },
        data: { rules: null },
        select: {
            rules: true,
        },
    })
}

export const settingRepository = {
    findUserByIdForInfo,
    findUserByIdForProfile,
    findUserByIdForExistCheck,
    findUserByIdForUsernameCheck,
    findUserByUsername,
    updateUserName,
    updateUsername,

    findUserPasswordById,
    updatePassword,
    updateNotifications,
    findUserByIdForChatSuggestions,
    updateChatSuggestions,
    findUserByIdForGenerationSound,
    updateGenerationSound,

    updateCompleteOnboarding,
    updateWelcomeCardDone,
    updateGithubCardDone,
    updateFeedbackCardDone,
    createFeedback,
    findUserByEmail,

    findUserRules,
    updateUserRules,
    deleteUserRules,
}
