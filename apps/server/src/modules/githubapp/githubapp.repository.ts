import { prisma } from '@december/database'

export async function upsertInstallation(installationId: string, userId: string) {
    const installation = await prisma.githubAppInstallation.upsert({
        where: { installationId },
        update: { userId },
        create: {
            installationId,
            userId,
        },
    })

    if (userId && userId !== 'system') {
        await prisma.user.update({
            where: { id: userId },
            data: { githubAppInstall: true, githubCardDone: true },
        })
    }

    return installation
}

export async function deleteInstallation(installationId: string) {
    const installation = await prisma.githubAppInstallation.findUnique({
        where: { installationId },
        select: { userId: true },
    })

    const deleted = await prisma.githubAppInstallation.delete({
        where: { installationId },
    })

    if (installation?.userId && installation.userId !== 'system') {
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

export const githubAppRepository = {
    upsertInstallation,
    deleteInstallation,
}
