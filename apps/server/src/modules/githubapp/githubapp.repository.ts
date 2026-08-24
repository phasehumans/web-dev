import { prisma } from '@december/database'

import type { ProcessInstallation } from './githubapp.types'

const upsertInstallation = async (data: ProcessInstallation) => {
    const { installationId, userId, accountLogin, accountType, targetType, permissions } = data

    const installation = await prisma.githubAppInstallation.upsert({
        where: { installationId },
        update: {
            userId,
            accountLogin: accountLogin ?? undefined,
            accountType: accountType ?? undefined,
            targetType: targetType ?? undefined,
            permissions: permissions ? (permissions as any) : undefined,
        },
        create: {
            installationId,
            userId,
            accountLogin,
            accountType,
            targetType,
            permissions: permissions ? (permissions as any) : undefined,
        },
    })

    if (userId && userId !== 'system') {
        await prisma.user.update({
            where: { id: userId },
            data: {
                githubAppInstall: true,
                githubCardDone: true,
                githubConnected: true,
                githubUsername: accountLogin || undefined,
            },
        })
    }

    return installation
}

const deleteInstallation = async (installationId: string) => {
    const installation = await prisma.githubAppInstallation.findUnique({
        where: { installationId },
        select: { userId: true },
    })

    if (!installation) {
        return null
    }

    const deleted = await prisma.githubAppInstallation.delete({
        where: { installationId },
    })

    if (installation.userId && installation.userId !== 'system') {
        const count = await prisma.githubAppInstallation.count({
            where: { userId: installation.userId },
        })
        if (count === 0) {
            await prisma.user.update({
                where: { id: installation.userId },
                data: { githubAppInstall: false },
            })
        }
    }

    return deleted
}

const findByUserId = async (userId: string) => {
    return prisma.githubAppInstallation.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    })
}

const findByInstallationId = async (installationId: string) => {
    return prisma.githubAppInstallation.findUnique({
        where: { installationId },
    })
}

export const githubAppRepository = {
    upsertInstallation,
    deleteInstallation,
    findByUserId,
    findByInstallationId,
}
