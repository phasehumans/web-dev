import { prisma } from '@december/database'

export const usageRepository = {
    async runTransaction<T>(fn: (tx: any) => Promise<T>) {
        return prisma.$transaction(fn)
    },

    async getUsageUser(data: { userId: string }) {
        const { userId } = data
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                createdAt: true,
                creditBalance: true,
            },
        })
    },

    async getPeriodAggregate(data: { userId: string; periodStart: Date; periodEnd: Date }) {
        const { userId, periodStart, periodEnd } = data
        const where: any = {
            userId,
            createdAt: {
                gte: periodStart,
                lt: periodEnd,
            },
        }

        const [aggregate, eventCount] = await Promise.all([
            prisma.usageEvent.aggregate({
                where,
                _sum: {
                    inputTokens: true,
                    outputTokens: true,
                    totalTokens: true,
                    costInCents: true,
                },
            }),
            prisma.usageEvent.count({
                where,
            }),
        ])

        return {
            eventCount,
            inputTokens: aggregate._sum.inputTokens ?? 0,
            outputTokens: aggregate._sum.outputTokens ?? 0,
            totalTokens: aggregate._sum.totalTokens ?? 0,
            costInCents: aggregate._sum.costInCents ?? 0,
        }
    },

    async findProject(data: { projectId: string; userId: string }) {
        const { projectId, userId } = data
        return prisma.project.findFirst({
            where: {
                id: projectId,
                userId,
            },
            select: {
                id: true,
            },
        })
    },

    async findExternalUsageEvent(data: { externalRequestId: string }) {
        const { externalRequestId } = data
        return prisma.usageEvent.findFirst({
            where: { externalRequestId },
        })
    },

    async findUserCredits(data: { userId: string }, tx?: any) {
        const { userId } = data
        if (tx) {
            const rows: any[] =
                await tx.$queryRaw`SELECT "creditBalance" FROM "User" WHERE id = ${userId} FOR UPDATE`
            return rows.length > 0 ? { creditBalance: rows[0].creditBalance } : null
        }
        return prisma.user.findUnique({
            where: { id: userId },
            select: { creditBalance: true },
        })
    },

    async updateUserCredits(data: { userId: string; creditBalance: number }, tx?: any) {
        const { userId, creditBalance } = data
        const client = tx || prisma
        return client.user.update({
            where: { id: userId },
            data: { creditBalance },
        })
    },

    async createUsageEvent(
        data: {
            userId: string
            model: string
            inputTokens: number
            outputTokens: number
            totalTokens: number
            costInCents: number
            sessionId?: string
            chatId?: string
            externalRequestId?: string
            periodStart: Date
            periodEnd: Date
            metadata?: any
        },
        tx?: any
    ) {
        const client = tx || prisma
        return client.usageEvent.create({
            data,
        })
    },
}
