import { AppError } from '../../shared/appError'

import { resolveModelRate } from './usage.rates'
import { usageRepository } from './usage.repository'

import type {
    GetCurrentUsage,
    CheckEnoughCredits,
    HasMinimumBalance,
    RecordUsageEvent,
    CalculateGenerationCost,
    CanRunSelfCorrection,
    UsageUser,
} from './usage.types'

const calculateGenerationCost = (data: CalculateGenerationCost): number => {
    const { modelName, inputTokens, outputTokens } = data
    if (inputTokens === 0 && outputTokens === 0) {
        return 0
    }

    let targetModel = modelName
    if (targetModel === 'auto') {
        targetModel = (
            process.env.DEFAULT_MODEL ||
            process.env.AUTO_MODEL ||
            'openai/gpt-oss-20b:free'
        ).trim()
    }

    const rate = resolveModelRate(targetModel)

    // convert usd per 1m tokens to cents per token:
    // cents/token = (usd/1m * 100) / 1,000,000 = usd/1m / 10,000
    const inputCentsPerToken = rate.inputRate / 10000
    const outputCentsPerToken = rate.outputRate / 10000

    const rawCost = inputTokens * inputCentsPerToken + outputTokens * outputCentsPerToken

    // ceiling rounding, minimum 1 cent
    return Math.max(Math.ceil(rawCost), 1)
}

const startOfUtcMonth = (date: Date) => {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

const startOfNextUtcMonth = (date: Date) => {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

const resolveCurrentPeriod = (user: UsageUser, now = new Date()) => {
    return {
        periodStart: startOfUtcMonth(now),
        periodEnd: startOfNextUtcMonth(now),
    }
}

const getUsageUser = async (userId: string): Promise<UsageUser> => {
    const user = await usageRepository.getUsageUser({ userId })

    if (!user) {
        throw new AppError('user not found', 404)
    }

    return user as unknown as UsageUser
}

const getPeriodAggregate = async (userId: string, periodStart: Date, periodEnd: Date) => {
    return usageRepository.getPeriodAggregate({ userId, periodStart, periodEnd })
}

const getCurrentUsage = async (data: GetCurrentUsage) => {
    const { userId } = data
    const user = await getUsageUser(userId)
    const { periodStart, periodEnd } = resolveCurrentPeriod(user)
    const usage = await getPeriodAggregate(user.id, periodStart, periodEnd)

    const remainingCreditsInCents = user.creditBalance

    return {
        periodStart,
        periodEnd,
        usage,
        credits: {
            limitInCents: null,
            usedInCents: usage.costInCents,
            remainingInCents: remainingCreditsInCents,
            unlimited: false,
        },
    }
}

const checkEnoughCredits = async (data: CheckEnoughCredits) => {
    const current = await getCurrentUsage({ userId: data.userId })
    const estimatedCostInCents = data.estimatedCostInCents ?? 0
    const enoughCredits =
        current.credits.unlimited || (current.credits.remainingInCents ?? 0) >= estimatedCostInCents

    return {
        enoughCredits,
        estimatedCostInCents,
        credits: current.credits,
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
    }
}

const hasMinimumBalance = async (data: HasMinimumBalance): Promise<boolean> => {
    const { userId } = data
    const user = await getUsageUser(userId)
    return user.creditBalance >= 1
}

const assertProjectOwnership = async (userId: string, projectId?: string) => {
    if (!projectId) {
        return
    }

    const project = await usageRepository.findProject({ projectId, userId })

    if (!project) {
        throw new AppError('project not found', 404)
    }
}

const findExternalUsageEvent = (externalRequestId: string) => {
    return usageRepository.findExternalUsageEvent({ externalRequestId })
}

const recordUsageEvent = async (data: RecordUsageEvent) => {
    const {
        userId,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        projectId,
        chatId,
        externalRequestId,
        metadata,
    } = data
    const user = await getUsageUser(userId)
    await assertProjectOwnership(user.id, projectId)

    if (externalRequestId) {
        const existingEvent = await findExternalUsageEvent(externalRequestId)

        if (existingEvent) {
            if (existingEvent.userId !== user.id) {
                throw new AppError('external request id already exists', 409)
            }

            return {
                event: existingEvent,
                idempotent: true,
            }
        }
    }

    const { periodStart, periodEnd } = resolveCurrentPeriod(user)
    const calculatedCost = calculateGenerationCost({
        modelName: model,
        inputTokens,
        outputTokens,
    })

    try {
        const result = await usageRepository.runTransaction(async (tx) => {
            const costLogged = calculatedCost

            // re-fetch user inside transaction to avoid race conditions
            const dbUser = await usageRepository.findUserCredits({ userId: user.id }, tx)
            if (!dbUser) {
                throw new AppError('user not found', 404)
            }

            let newCreditBalance = dbUser.creditBalance
            newCreditBalance = Math.max(newCreditBalance - calculatedCost, 0)

            // update user balance
            await usageRepository.updateUserCredits(
                {
                    userId: user.id,
                    creditBalance: newCreditBalance,
                },
                tx
            )

            // create usage event
            const event = await usageRepository.createUsageEvent(
                {
                    userId: user.id,
                    model,
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    costInCents: costLogged,
                    projectId,
                    chatId,
                    externalRequestId,
                    periodStart,
                    periodEnd,
                    metadata,
                },
                tx
            )

            return event
        })

        return {
            event: result,
            idempotent: false,
        }
    } catch (error: any) {
        if (error?.code === 'P2002' && externalRequestId) {
            const existingEvent = await findExternalUsageEvent(externalRequestId)

            if (existingEvent && existingEvent.userId === user.id) {
                return {
                    event: existingEvent,
                    idempotent: true,
                }
            }
        }

        throw error
    }
}

const canRunSelfCorrection = async (data: CanRunSelfCorrection): Promise<boolean> => {
    const { userId } = data
    try {
        const user = await usageRepository.findUserCredits({ userId })
        if (!user) return false

        const threshold = parseInt(process.env.SELF_CORRECTION_CREDIT_THRESHOLD || '5', 10) // default 5 cents
        return user.creditBalance >= threshold
    } catch {
        // Intentionally swallowed: fallback to false if user not found or error occurred
        return false
    }
}

export const usageService = {
    getCurrentUsage,
    checkEnoughCredits,
    hasMinimumBalance,
    recordUsageEvent,
    calculateGenerationCost,
    canRunSelfCorrection,
}
