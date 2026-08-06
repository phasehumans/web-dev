import { prisma } from '@december/database'

import { AppError } from '../../shared/appError'

export const billingRepository = {
    async findUserForOverview(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                creditBalance: true,
                redeemClaims: {
                    include: {
                        redeemCode: true,
                    },
                },
                walletTransactions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        })
    },

    async aggregateUsage(userId: string, periodStart: Date, periodEnd: Date) {
        return prisma.usageEvent.aggregate({
            where: {
                userId,
                createdAt: {
                    gte: periodStart,
                    lt: periodEnd,
                },
            },
            _sum: {
                costInCents: true,
                inputTokens: true,
                outputTokens: true,
                totalTokens: true,
            },
        })
    },

    async findRedeemCodeClaims(userId: string) {
        return prisma.redeemCodeClaim.findMany({
            where: { userId },
            include: {
                redeemCode: true,
            },
        })
    },

    async createWalletTransaction(data: {
        userId: string
        amountInCents: number
        currency: string
        provider: 'RAZORPAY' | 'COINBASE'
        providerOrderId?: string
        metadata?: any
    }) {
        return prisma.walletTransaction.create({
            data: {
                userId: data.userId,
                amountInCents: data.amountInCents,
                currency: data.currency,
                provider: data.provider,
                providerOrderId: data.providerOrderId,
                metadata: data.metadata || {},
            },
        })
    },

    async findWalletTransactionByOrderId(providerOrderId: string) {
        return prisma.walletTransaction.findFirst({
            where: { providerOrderId },
        })
    },

    async updateWalletTransaction(
        id: string,
        data: {
            status: 'PENDING' | 'SUCCESS' | 'FAILED'
            providerPaymentId?: string
            metadata?: any
        }
    ) {
        return prisma.walletTransaction.update({
            where: { id },
            data,
        })
    },

    async verifyAndUpdateWalletTransaction(
        transactionId: string,
        userId: string,
        amountInCents: number,
        providerPaymentId: string
    ) {
        return prisma.$transaction(async (tx) => {
            // Acquire row lock on user record
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`

            // Atomically update transaction status only if it is currently PENDING
            const updateCount = await tx.walletTransaction.updateMany({
                where: {
                    id: transactionId,
                    status: 'PENDING',
                },
                data: {
                    status: 'SUCCESS',
                    providerPaymentId,
                },
            })

            if (updateCount.count === 0) {
                // If updateCount is 0, another concurrent request already completed or marked this transaction as SUCCESS/FAILED
                throw new AppError('transaction already processed or invalid status', 400)
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    creditBalance: {
                        increment: amountInCents,
                    },
                },
            })

            return updatedUser
        })
    },

    async findManyUsageEvents(where: any, offset: number, limit: number) {
        return prisma.usageEvent.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                session: {
                    select: {
                        title: true,
                    },
                },
            },
            skip: offset,
            take: limit,
        })
    },

    async countUsageEvents(where: any) {
        return prisma.usageEvent.count({
            where,
        })
    },

    async findUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                isDeleted: true,
            },
        })
    },

    async redeemCode(data: { userId: string; codeHash: string }) {
        const { userId, codeHash } = data
        return prisma.$transaction(async (tx) => {
            const dbCode = await tx.redeemCode.findUnique({
                where: { codeHash },
            })

            if (!dbCode) {
                throw new AppError('invalid or expired redeem code', 404)
            }

            const now = new Date()
            if (dbCode.expiresAt && dbCode.expiresAt < now) {
                throw new AppError('this redeem code has expired', 400)
            }

            if (dbCode.maxRedemptions !== null && dbCode.redemptionCount >= dbCode.maxRedemptions) {
                throw new AppError('this redeem code has reached its maximum redemptions', 400)
            }

            const existingClaim = await tx.redeemCodeClaim.findUnique({
                where: {
                    redeemCodeId_userId: {
                        redeemCodeId: dbCode.id,
                        userId,
                    },
                },
            })

            if (existingClaim) {
                throw new AppError('you have already redeemed this code', 409)
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    creditBalance: {
                        increment: dbCode.creditAmount,
                    },
                },
            })

            await tx.redeemCodeClaim.create({
                data: {
                    redeemCodeId: dbCode.id,
                    userId,
                },
            })

            await tx.redeemCode.update({
                where: { id: dbCode.id },
                data: {
                    redemptionCount: {
                        increment: 1,
                    },
                },
            })

            return {
                creditAmount: dbCode.creditAmount,
                newBalance: updatedUser.creditBalance,
            }
        })
    },

    async findUserByIdForCredits(id: string) {
        return prisma.user.findUnique({
            where: { id },
        })
    },

    async addCredits(userId: string, amountInCents: number) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                creditBalance: {
                    increment: amountInCents,
                },
            },
        })
    },
}
