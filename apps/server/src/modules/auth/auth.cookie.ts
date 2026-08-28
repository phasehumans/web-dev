import { env } from '../../env'

import type { Response } from 'express'

const isProduction = env.NODE_ENV === 'production'

const getCookieDomain = (): string | undefined => {
    if (!isProduction) return undefined
    try {
        const hostname = new URL(env.WEB_URL).hostname
        if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined

        // Prevent setting domain cookies on Public Suffixes (which browsers reject)
        if (
            hostname.endsWith('.vercel.app') ||
            hostname.endsWith('.pages.dev') ||
            hostname.endsWith('.onrender.com') ||
            hostname.endsWith('.railway.app') ||
            hostname.endsWith('.up.railway.app')
        ) {
            return undefined
        }

        if (hostname === 'trydecember.com' || hostname.endsWith('.trydecember.com')) {
            return '.trydecember.com'
        }

        const parts = hostname.split('.')
        if (parts.length === 2) {
            return `.${parts.join('.')}`
        }

        return undefined
    } catch {
        return undefined
    }
}

const cookieDomain = getCookieDomain()

const getBaseCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
})

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
    const base = getBaseCookieOptions()
    res.cookie('accessToken', accessToken, {
        ...base,
        maxAge: 15 * 60 * 1000, // 15 min
    })

    res.cookie('refreshToken', refreshToken, {
        ...base,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
}

const setAccessTokenCookie = (res: Response, accessToken: string) => {
    const base = getBaseCookieOptions()
    res.cookie('accessToken', accessToken, {
        ...base,
        maxAge: 15 * 60 * 1000, // 15 min
    })
}

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
    const base = getBaseCookieOptions()
    res.cookie('refreshToken', refreshToken, {
        ...base,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
}

const clearAuthCookies = (res: Response) => {
    const base = getBaseCookieOptions()
    res.clearCookie('accessToken', base)
    res.clearCookie('refreshToken', base)
}

export const authCookie = {
    setAuthCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
}
