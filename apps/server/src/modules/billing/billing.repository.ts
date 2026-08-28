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
                    orderBy: {
                        redeemedAt: 'desc',
                    },
                    take: 10,
                },
                walletTransactions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
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
            const currentTx = await tx.walletTransaction.findUnique({
                where: { id: transactionId },
            })

            if (!currentTx) {
                throw new AppError('transaction order not found', 404)
            }

            if (currentTx.userId !== userId) {
                throw new AppError('unauthorized to verify this transaction', 403)
            }

            // Idempotency: If already credited, return current user state without re-crediting
            if (currentTx.status === 'SUCCESS') {
                const user = await tx.user.findUnique({
                    where: { id: userId },
                })
                return {
                    user: user || { id: userId, creditBalance: 0 },
                    alreadyProcessed: true,
                }
            }

            // Atomically update transaction status to SUCCESS (from PENDING or transient FAILED)
            const updateCount = await tx.walletTransaction.updateMany({
                where: {
                    id: transactionId,
                    status: {
                        in: ['PENDING', 'FAILED'],
                    },
                },
                data: {
                    status: 'SUCCESS',
                    providerPaymentId,
                },
            })

            if (updateCount.count === 0) {
                // If another concurrent request completed it in the millisecond between findUnique and updateMany
                const user = await tx.user.findUnique({
                    where: { id: userId },
                })
                return {
                    user: user || { id: userId, creditBalance: 0 },
                    alreadyProcessed: true,
                }
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    creditBalance: {
                        increment: amountInCents,
                    },
                },
            })

            return {
                user: updatedUser,
                alreadyProcessed: false,
            }
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

            // Atomically update redemptionCount ensuring maxRedemptions limit isn't exceeded concurrently
            if (dbCode.maxRedemptions !== null) {
                const updateCode = await tx.redeemCode.updateMany({
                    where: {
                        id: dbCode.id,
                        redemptionCount: {
                            lt: dbCode.maxRedemptions,
                        },
                    },
                    data: {
                        redemptionCount: {
                            increment: 1,
                        },
                    },
                })

                if (updateCode.count === 0) {
                    throw new AppError('this redeem code has reached its maximum redemptions', 400)
                }
            } else {
                await tx.redeemCode.update({
                    where: { id: dbCode.id },
                    data: {
                        redemptionCount: {
                            increment: 1,
                        },
                    },
                })
            }

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
