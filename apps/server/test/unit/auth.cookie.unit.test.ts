import { describe, it, expect } from 'bun:test'

import { authCookie } from '../../src/modules/auth/auth.cookie'
import { createMockResponse } from '../helpers'

describe('Auth Cookie - Unit Tests', () => {
    it('setAuthCookies should set both accessToken and refreshToken cookies on response', () => {
        const res = createMockResponse()
        authCookie.setAuthCookies(res, 'access-token-val', 'refresh-token-val')

        const cookies = (res as any).cookies
        expect(cookies.accessToken).toBeDefined()
        expect(cookies.accessToken.value).toBe('access-token-val')
        expect(cookies.accessToken.options.httpOnly).toBe(true)
        expect(cookies.accessToken.options.sameSite).toBe('lax')
        expect(cookies.accessToken.options.maxAge).toBe(15 * 60 * 1000)

        expect(cookies.refreshToken).toBeDefined()
        expect(cookies.refreshToken.value).toBe('refresh-token-val')
        expect(cookies.refreshToken.options.httpOnly).toBe(true)
        expect(cookies.refreshToken.options.sameSite).toBe('lax')
        expect(cookies.refreshToken.options.maxAge).toBe(30 * 24 * 60 * 60 * 1000)
    })

    it('setAccessTokenCookie should set only accessToken cookie', () => {
        const res = createMockResponse()
        authCookie.setAccessTokenCookie(res, 'access-token-only')

        const cookies = (res as any).cookies
        expect(cookies.accessToken).toBeDefined()
        expect(cookies.accessToken.value).toBe('access-token-only')
        expect(cookies.refreshToken).toBeUndefined()
    })

    it('setRefreshTokenCookie should set only refreshToken cookie', () => {
        const res = createMockResponse()
        authCookie.setRefreshTokenCookie(res, 'refresh-token-only')

        const cookies = (res as any).cookies
        expect(cookies.refreshToken).toBeDefined()
        expect(cookies.refreshToken.value).toBe('refresh-token-only')
        expect(cookies.accessToken).toBeUndefined()
    })

    it('clearAuthCookies should clear both auth cookies', () => {
        const res = createMockResponse()
        authCookie.clearAuthCookies(res)

        const cookies = (res as any).cookies
        expect(cookies.accessToken).toBeDefined()
        expect(cookies.accessToken.value).toBe('')
        expect(cookies.refreshToken).toBeDefined()
        expect(cookies.refreshToken.value).toBe('')
    })
})
