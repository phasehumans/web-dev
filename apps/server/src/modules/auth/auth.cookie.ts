import { env } from '../../env'

import type { Response } from 'express'

const isProduction = env.NODE_ENV === 'production'

const getCookieDomain = (): string | undefined => {
    if (!isProduction) return undefined
    try {
        const hostname = new URL(env.WEB_URL).hostname
        if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
        const parts = hostname.split('.')
        if (parts.length >= 2) {
            return `.${parts.slice(-2).join('.')}`
        }
        return `.${hostname}`
    } catch {
        return undefined
    }
}

const cookieDomain = getCookieDomain()

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 min
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
}

const setAccessTokenCookie = (res: Response, accessToken: string) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 min
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
}

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
}

const clearAuthCookies = (res: Response) => {
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
    })
}

export const authCookie = {
    setAuthCookies,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
}
