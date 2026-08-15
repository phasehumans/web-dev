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

type RuntimeEnv = {
    process?: {
        env?: Record<string, string | undefined>
    }
    Bun?: {
        env?: Record<string, string | undefined>
    }
    __ENV__?: Record<string, string | undefined>
}

const resolveBaseUrl = () => {
    const runtime = globalThis as typeof globalThis & RuntimeEnv

    return (
        runtime.Bun?.env?.BASE_URL ??
        runtime.process?.env?.BASE_URL ??
        runtime.__ENV__?.BASE_URL ??
        'http://localhost:4000'
    )
}

const rawBaseUrl = resolveBaseUrl()

const normalizedBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl

export const API_BASE_URL = normalizedBaseUrl.endsWith('/api/v1')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api/v1`

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

let activeRefreshPromise: Promise<boolean> | null = null

export const refreshAuthSession = async () => {
    if (activeRefreshPromise) {
        return activeRefreshPromise
    }

    activeRefreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            })

            return res.ok
        } catch {
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
