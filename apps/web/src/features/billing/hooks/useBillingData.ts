import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { billingAPI } from '../api/billing'

export const billingQueryKeys = {
    overview: ['billing-overview'] as const,
    history: (limit?: number, offset?: number, periodStart?: string, periodEnd?: string) =>
        ['credits-history', { limit, offset, periodStart, periodEnd }] as const,
}

export const useBillingOverview = (enabled: boolean = true) => {
    return useQuery({
        queryKey: billingQueryKeys.overview,
        queryFn: billingAPI.getOverview,
        staleTime: 10 * 1000, // 10 seconds stale time
        enabled,
    })
}

export const useCreditsHistory = (
    params: { limit?: number; offset?: number; periodStart?: string; periodEnd?: string } = {}
) => {
    return useQuery({
        queryKey: billingQueryKeys.history(
            params.limit,
            params.offset,
            params.periodStart,
            params.periodEnd
        ),
        queryFn: () => billingAPI.getCreditsHistory(params),
        staleTime: 30 * 1000, // 30 seconds stale time
    })
}

export const useCreateRazorpayOrder = () => {
    return useMutation({
        mutationFn: billingAPI.createRazorpayOrder,
    })
}

export const useVerifyRazorpayPayment = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: billingAPI.verifyRazorpayPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingQueryKeys.overview })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })
}

export const useRedeemCode = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: billingAPI.redeemCode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingQueryKeys.overview })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })
}

export const useAddCredits = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: { amountInCents: number; paymentMethod: string }) =>
            billingAPI.addCredits(data.amountInCents, data.paymentMethod),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billingQueryKeys.overview })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
        },
    })
}
