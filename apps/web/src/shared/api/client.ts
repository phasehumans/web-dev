type ApiEnvelope<T> = {
    success: boolean
    message?: string
    data?: T
    errors?: unknown
}

type RequestOptions = Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string>
    includeAuth?: boolean
}

import { getApiBaseUrl } from '../config/env'

export const API_BASE_URL = getApiBaseUrl()

export class ApiError extends Error {
    status: number
    details?: unknown

    constructor(message: string, status: number, details?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.details = details
    }
}

const toApiError = async (res: Response) => {
    let payload: { message?: string; errors?: unknown } | null

    try {
        payload = await res.json()
    } catch {
        payload = null
    }

    const errorsMsg = typeof payload?.errors === 'string' ? payload.errors : undefined

    const message = errorsMsg || payload?.message || `Request failed with status ${res.status}`

    return new ApiError(message, res.status, payload?.errors)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isTransientError = (status?: number) => {
    if (!status) return true // Network failure or connection refused
    return status === 429 || status === 502 || status === 503 || status === 504 || status === 500
}

let activeRefreshPromise: Promise<boolean> | null = null

export const refreshAuthSession = async (maxRetries = 3) => {
    if (activeRefreshPromise) {
        return activeRefreshPromise
    }

    activeRefreshPromise = (async () => {
        try {
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                        method: 'POST',
                        credentials: 'include',
                    })

                    if (res.ok) {
                        return true
                    }

                    // If it's a permanent auth error (401/403/400), don't retry
                    if (!isTransientError(res.status)) {
                        return false
                    }

                    // If transient server error (502/503/504) during deployment, wait and retry
                    if (attempt < maxRetries) {
                        const delayMs = attempt === 0 ? 2000 : 3000
                        await wait(delayMs)
                    }
                } catch {
                    // Intentionally swallowed: Network errors (e.g. EC2 restarting) are retried before declaring unauthenticated
                    if (attempt < maxRetries) {
                        const delayMs = attempt === 0 ? 2000 : 3000
                        await wait(delayMs)
                    }
                }
            }

            return false
        } finally {
            activeRefreshPromise = null
        }
    })()

    return activeRefreshPromise
}

export const apiFetch = async (
    path: string,
    options: RequestInit = {},
    retryOnUnauthorized = true
) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
    })

    if (res.status !== 401 || !retryOnUnauthorized) {
        return res
    }

    const refreshed = await refreshAuthSession()

    if (!refreshed) {
        return res
    }

    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
    })
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
    const { includeAuth = true, headers, ...rest } = options
    const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData

    const res = await apiFetch(
        path,
        {
            ...rest,
            headers: {
                ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                ...headers,
            },
        },
        includeAuth
    )

    if (!res.ok) {
        throw await toApiError(res)
    }

    const payload = (await res.json()) as ApiEnvelope<T>
    return payload.data as T
}
