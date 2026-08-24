import { describe, it, expect } from 'bun:test'

import {
    hashRefreshToken,
    getNameFromEmail,
    generateUserCode,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    extractToken,
    sendOTP,
    sendWelcomeEmail,
} from '../../src/modules/auth/auth.utils'

describe('Auth Utils - Unit Tests', () => {
    describe('hashRefreshToken', () => {
        it('should return a 64-character SHA-256 hex string', () => {
            const token = 'sample-refresh-token-12345'
            const hash = hashRefreshToken(token)
            expect(hash).toHaveLength(64)
            expect(hash).toMatch(/^[a-f0-9]{64}$/)
        })

        it('should produce identical hashes for identical inputs', () => {
            const token = 'same-token'
            expect(hashRefreshToken(token)).toBe(hashRefreshToken(token))
        })

        it('should produce different hashes for different inputs', () => {
            expect(hashRefreshToken('token1')).not.toBe(hashRefreshToken('token2'))
        })
    })

    describe('getNameFromEmail', () => {
        it('should extract local part of email and strip numbers', () => {
            expect(getNameFromEmail('john123doe456@example.com')).toBe('johndoe')
            expect(getNameFromEmail('alice@domain.org')).toBe('alice')
        })

        it('should return empty string for invalid or empty email inputs', () => {
            expect(getNameFromEmail('')).toBe('')
            expect(getNameFromEmail('invalidemail')).toBe('')
            expect(getNameFromEmail('@domain.com')).toBe('')
        })
    })

    describe('generateUserCode', () => {
        it('should generate a code in the format XXXX-XXXX', () => {
            const code = generateUserCode()
            expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
            expect(code).toHaveLength(9)
        })

        it('should generate unique user codes across multiple calls', () => {
            const code1 = generateUserCode()
            const code2 = generateUserCode()
            expect(code1).not.toBe(code2)
        })
    })

    describe('JWT Access & Refresh Token Generation / Verification', () => {
        const payload = {
            userId: 'user-uuid-123',
            sessionId: 'session-uuid-456',
        }

        it('should generate and verify a valid access token', () => {
            const token = generateAccessToken(payload)
            expect(typeof token).toBe('string')

            const decoded = verifyAccessToken(token)
            expect(decoded.userId).toBe(payload.userId)
            expect(decoded.sessionId).toBe(payload.sessionId)
        })

        it('should generate and verify a valid refresh token', () => {
            const token = generateRefreshToken(payload)
            expect(typeof token).toBe('string')

            const decoded = verifyRefreshToken(token)
            expect(decoded.userId).toBe(payload.userId)
            expect(decoded.sessionId).toBe(payload.sessionId)
        })

        it('should throw error when verifying invalid or tampered access token', () => {
            expect(() => verifyAccessToken('invalid.jwt.token')).toThrow()
        })

        it('should throw error when verifying invalid or tampered refresh token', () => {
            expect(() => verifyRefreshToken('invalid.jwt.token')).toThrow()
        })
    })

    describe('extractToken', () => {
        it('should extract token from Bearer authorization header', () => {
            const req = {
                headers: { authorization: 'Bearer header-token-123' },
                cookies: {},
            }
            expect(extractToken(req)).toBe('header-token-123')
        })

        it('should fallback to cookie if authorization header is missing', () => {
            const req = {
                headers: {},
                cookies: { accessToken: 'cookie-token-456' },
            }
            expect(extractToken(req)).toBe('cookie-token-456')
        })

        it('should prioritize Bearer header over cookie if both present', () => {
            const req = {
                headers: { authorization: 'Bearer header-token-789' },
                cookies: { accessToken: 'cookie-token-456' },
            }
            expect(extractToken(req)).toBe('header-token-789')
        })

        it('should return undefined if neither header nor cookie contains token', () => {
            const req = {
                headers: { authorization: 'Basic dXNlcjpwYXNz' },
                cookies: {},
            }
            expect(extractToken(req)).toBeUndefined()
        })
    })

    describe('sendOTP & sendWelcomeEmail', () => {
        it('should execute sendOTP without throwing', async () => {
            const resend = (await import('../../src/config/email')).default
            const originalSend = resend.emails.send
            resend.emails.send = (async () => ({ data: { id: 'email-123' }, error: null })) as any

            try {
                await expect(sendOTP('test@example.com', '123456')).resolves.toBeUndefined()
                await expect(
                    sendOTP('test@example.com', '123456', 'signup')
                ).resolves.toBeUndefined()
                await expect(
                    sendOTP('test@example.com', '123456', 'password_reset')
                ).resolves.toBeUndefined()
            } finally {
                resend.emails.send = originalSend
            }
        })

        it('should execute sendWelcomeEmail without throwing', async () => {
            const resend = (await import('../../src/config/email')).default
            const originalSend = resend.emails.send
            resend.emails.send = (async () => ({ data: { id: 'email-123' }, error: null })) as any

            try {
                await expect(
                    sendWelcomeEmail('test@example.com', 'Test User')
                ).resolves.toBeUndefined()
            } finally {
                resend.emails.send = originalSend
            }
        })
    })
})
