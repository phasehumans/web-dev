import { apiRequest } from '@/shared/api/client'

export interface BillingOverview {
    creditBalance: number
    giftedCredits: number
    createdAt: string
    usdToInrRate?: number
    usage: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
        costInCents: number
    }
    claims: Array<{
        id: string
        createdAt: string
        amountInCents: number
        code: string
    }>
    transactions: Array<{
        id: string
        createdAt: string
        amountInCents: number
        currency: string
        provider: 'RAZORPAY' | 'COINBASE'
        status: 'PENDING' | 'SUCCESS' | 'FAILED'
    }>
}

export interface CreateRazorpayOrderInput {
    amountInCents: number
    currency?: string
}

export interface CreateRazorpayOrderResponse {
    keyId: string
    orderId: string
    amount: number
    currency: string
    usdToInrRate?: number
}

export interface VerifyRazorpayPaymentInput {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
}

export interface VerifyRazorpayPaymentResponse {
    success: boolean
    alreadyProcessed?: boolean
    newBalance?: number
}

export interface UsageEvent {
    id: string
    userId: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costInCents: number
    projectId: string | null
    chatId: string | null
    externalRequestId: string | null
    periodStart: string
    periodEnd: string
    metadata: any
    createdAt: string
    project?: { name: string } | null
    session?: { title: string | null } | null
}

export interface CreditsHistoryResponse {
    events: UsageEvent[]
    total: number
    limit: number
    offset: number
    periods: Array<{
        periodStart: string
        periodEnd: string
        costInCents: number
    }>
}

const getOverview = () => {
    return apiRequest<BillingOverview>('/billing/overview')
}

const createRazorpayOrder = (data: CreateRazorpayOrderInput) => {
    return apiRequest<CreateRazorpayOrderResponse>('/billing/wallet/order/razorpay', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

const verifyRazorpayPayment = (data: VerifyRazorpayPaymentInput) => {
    return apiRequest<VerifyRazorpayPaymentResponse>('/billing/wallet/verify/razorpay', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

const getCreditsHistory = (
    params: { limit?: number; offset?: number; periodStart?: string; periodEnd?: string } = {}
) => {
    const query = new URLSearchParams()
    if (params.limit !== undefined) query.set('limit', params.limit.toString())
    if (params.offset !== undefined) query.set('offset', params.offset.toString())
    if (params.periodStart !== undefined) query.set('periodStart', params.periodStart)
    if (params.periodEnd !== undefined) query.set('periodEnd', params.periodEnd)

    const queryString = query.toString()
    const path = `/billing/credits/history${queryString ? `?${queryString}` : ''}`
    return apiRequest<CreditsHistoryResponse>(path)
}

const redeemCode = (code: string) => {
    return apiRequest<{ creditAmount: number; newBalance: number }>('/billing/redeem-code', {
        method: 'POST',
        body: JSON.stringify({ code }),
    })
}

const addCredits = (amountInCents: number, paymentMethod: string) => {
    return apiRequest<{ success: boolean; newBalance: number }>('/billing/credits/add', {
        method: 'POST',
        body: JSON.stringify({ amountInCents, paymentMethod }),
    })
}

export const billingAPI = {
    getOverview,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getCreditsHistory,
    redeemCode,
    addCredits,
}
