import { prisma } from '@december/database'

export async function upsertSecret(
    userId: string,
    name: string,
    encryptedValue: string,
    note?: string
) {
    return prisma.secret.upsert({
        where: {
            userId_name: {
                userId,
                name,
            },
        },
        update: {
            value: encryptedValue,
            ...(note !== undefined && { note }),
        },
        create: {
            userId,
            name,
            value: encryptedValue,
            note,
        },
    })
}

export async function bulkUpsertSecrets(
    userId: string,
    secrets: { name: string; encryptedValue: string; note?: string }[]
) {
    return prisma.$transaction(
        secrets.map((item) =>
            prisma.secret.upsert({
                where: {
                    userId_name: {
                        userId,
                        name: item.name,
                    },
                },
                update: {
                    value: item.encryptedValue,
                    ...(item.note !== undefined && { note: item.note }),
                },
                create: {
                    userId,
                    name: item.name,
                    value: item.encryptedValue,
                    note: item.note,
                },
            })
        )
    )
}

export async function findSecretsByUser(userId: string) {
    return prisma.secret.findMany({
        where: { userId },
        select: { id: true, name: true, note: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
    })
}

export async function findSecretByName(userId: string, name: string) {
    return prisma.secret.findUnique({
        where: {
            userId_name: {
                userId,
                name,
            },
        },
    })
}

export async function deleteSecret(userId: string, name: string) {
    return prisma.secret.delete({
        where: {
            userId_name: {
                userId,
                name,
            },
        },
    })
}

export async function findSecretsWithValuesByUser(userId: string) {
    return prisma.secret.findMany({
        where: { userId },
    })
}

export const secretsRepository = {
    upsertSecret,
    bulkUpsertSecrets,
    findSecretsByUser,
    findSecretByName,
    deleteSecret,
    findSecretsWithValuesByUser,
}
