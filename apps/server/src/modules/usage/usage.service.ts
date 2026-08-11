import { AppError } from '../../shared/appError'

import { usageRepository } from './usage.repository'

import type {
    GetCurrentUsage,
    CheckEnoughCredits,
    HasMinimumBalance,
    RecordUsageEvent,
    CalculateGenerationCost,
    CanRunSelfCorrection,
    UsageUser,
    ModelRate,
} from './usage.types'

const getModelRatesFromEnv = (): ModelRate[] => {
    const rates: ModelRate[] = []
    for (let i = 1; i <= 8; i++) {
        const name = process.env[`MODEL_${i}_NAME`]
        const inputRateStr = process.env[`MODEL_${i}_INPUT_RATE`]
        const outputRateStr = process.env[`MODEL_${i}_OUTPUT_RATE`]
        if (name) {
            rates.push({
                name: name.trim(),
                inputRate: parseFloat(inputRateStr ?? '0'),
                outputRate: parseFloat(outputRateStr ?? '0'),
            })
        }
    }
    return rates
}

const calculateGenerationCost = (data: CalculateGenerationCost): number => {
    const { modelName, inputTokens, outputTokens } = data
    if (inputTokens === 0 && outputTokens === 0) {
        return 0
    }

    const rates = getModelRatesFromEnv()
    let matchedRate = rates.find((r) => r.name.toLowerCase() === modelName.trim().toLowerCase())

    if (!matchedRate && modelName === 'auto') {
        const resolvedAuto = (
            process.env.DEFAULT_MODEL ||
            process.env.AUTO_MODEL ||
            'openai/gpt-oss-20b:free'
        ).trim()
        matchedRate = rates.find((r) => r.name.toLowerCase() === resolvedAuto.toLowerCase())
    }

    let inputRatePer1M = parseFloat(process.env.FALLBACK_MODEL_INPUT_RATE ?? '2.00')
    let outputRatePer1M = parseFloat(process.env.FALLBACK_MODEL_OUTPUT_RATE ?? '8.00')

    if (matchedRate) {
        inputRatePer1M = matchedRate.inputRate
        outputRatePer1M = matchedRate.outputRate
    }

    // convert usd per 1m tokens to cents per token:
    // cents/token = (usd/1m * 100) / 1,000,000 = usd/1m / 10,000
    const inputCentsPerToken = inputRatePer1M / 10000
    const outputCentsPerToken = outputRatePer1M / 10000

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
    const user = await getUsageUser(data.userId)
    await assertProjectOwnership(user.id, data.projectId)

    if (data.externalRequestId) {
        const existingEvent = await findExternalUsageEvent(data.externalRequestId)

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
        modelName: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
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
                    model: data.model,
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    costInCents: costLogged,
                    projectId: data.projectId,
                    chatId: data.chatId,
                    externalRequestId: data.externalRequestId,
                    periodStart,
                    periodEnd,
                    metadata: data.metadata,
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
        if (error?.code === 'P2002' && data.externalRequestId) {
            const existingEvent = await findExternalUsageEvent(data.externalRequestId)

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
    try {
        const { userId } = data
        const user = await usageRepository.findUserCredits({ userId })
        if (!user) return false

        const threshold = parseInt(process.env.SELF_CORRECTION_CREDIT_THRESHOLD || '5', 10) // default 5 cents
        return user.creditBalance >= threshold
    } catch {
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
