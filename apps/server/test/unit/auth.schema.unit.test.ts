import { describe, it, expect } from 'bun:test'

import {
    signupSchema,
    verifyOtpSchema,
    loginSchema,
    forgotPasswordRequestSchema,
    forgotPasswordVerifySchema,
    forgotPasswordResetSchema,
    googleAuthSchema,
    githubAuthSchema,
    pollDeviceTokenSchema,
    verifyUserCodeSchema,
} from '../../src/modules/auth/auth.schema'

describe('Auth Schema - Unit Tests', () => {
    describe('signupSchema', () => {
        it('should pass with valid email and password', () => {
            const valid = { email: 'test@example.com', password: 'Password123' }
            expect(signupSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with invalid email', () => {
            const invalid = { email: 'not-an-email', password: 'Password123' }
            const result = signupSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })

        it('should fail if password is too short (<6 chars)', () => {
            const invalid = { email: 'test@example.com', password: '123' }
            const result = signupSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })

        it('should fail if password is too long (>20 chars)', () => {
            const invalid = { email: 'test@example.com', password: 'A'.repeat(21) }
            const result = signupSchema.safeParse(invalid)
            expect(result.success).toBe(false)
        })
    })

    describe('verifyOtpSchema', () => {
        it('should pass with valid email and 6-digit OTP', () => {
            const valid = { email: 'test@example.com', otp: '123456' }
            expect(verifyOtpSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail if OTP is not 6 digits', () => {
            expect(
                verifyOtpSchema.safeParse({ email: 'test@example.com', otp: '12345' }).success
            ).toBe(false)
            expect(
                verifyOtpSchema.safeParse({ email: 'test@example.com', otp: '1234567' }).success
            ).toBe(false)
            expect(
                verifyOtpSchema.safeParse({ email: 'test@example.com', otp: 'abcdef' }).success
            ).toBe(false)
        })
    })

    describe('loginSchema', () => {
        it('should pass with valid email and password', () => {
            const valid = { email: 'test@example.com', password: 'Password123' }
            expect(loginSchema.safeParse(valid).success).toBe(true)
        })

        it('should fail with invalid email or short password', () => {
            expect(
                loginSchema.safeParse({ email: 'invalid', password: 'Password123' }).success
            ).toBe(false)
            expect(
                loginSchema.safeParse({ email: 'test@example.com', password: '123' }).success
            ).toBe(false)
        })
    })

    describe('forgotPassword schemas', () => {
        it('forgotPasswordRequestSchema requires valid email', () => {
            expect(
                forgotPasswordRequestSchema.safeParse({ email: 'user@example.com' }).success
            ).toBe(true)
            expect(forgotPasswordRequestSchema.safeParse({ email: 'invalid' }).success).toBe(false)
        })

        it('forgotPasswordVerifySchema requires email and 6-digit OTP', () => {
            expect(
                forgotPasswordVerifySchema.safeParse({ email: 'user@example.com', otp: '654321' })
                    .success
            ).toBe(true)
            expect(
                forgotPasswordVerifySchema.safeParse({ email: 'user@example.com', otp: 'invalid' })
                    .success
            ).toBe(false)
        })

        it('forgotPasswordResetSchema requires email, 6-digit OTP, and newPassword', () => {
            expect(
                forgotPasswordResetSchema.safeParse({
                    email: 'user@example.com',
                    otp: '654321',
                    newPassword: 'NewPassword1',
                }).success
            ).toBe(true)
            expect(
                forgotPasswordResetSchema.safeParse({
                    email: 'user@example.com',
                    otp: '654321',
                    newPassword: 'short',
                }).success
            ).toBe(false)
        })
    })

    describe('googleAuthSchema', () => {
        it('should pass if code is provided', () => {
            expect(googleAuthSchema.safeParse({ code: 'google-code-123' }).success).toBe(true)
        })

        it('should pass if credential is provided', () => {
            expect(
                googleAuthSchema.safeParse({ credential: 'google-jwt-credential' }).success
            ).toBe(true)
        })

        it('should fail if neither code nor credential is provided', () => {
            expect(googleAuthSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('githubAuthSchema', () => {
        it('should pass if code is provided', () => {
            expect(githubAuthSchema.safeParse({ code: 'github-code-123' }).success).toBe(true)
        })

        it('should fail if code is missing or empty', () => {
            expect(githubAuthSchema.safeParse({ code: '' }).success).toBe(false)
            expect(githubAuthSchema.safeParse({}).success).toBe(false)
        })
    })

    describe('pollDeviceTokenSchema & verifyUserCodeSchema', () => {
        it('pollDeviceTokenSchema requires non-empty deviceCode', () => {
            expect(pollDeviceTokenSchema.safeParse({ deviceCode: 'dev-123' }).success).toBe(true)
            expect(pollDeviceTokenSchema.safeParse({ deviceCode: '' }).success).toBe(false)
        })

        it('verifyUserCodeSchema requires non-empty userCode', () => {
            expect(verifyUserCodeSchema.safeParse({ userCode: 'ABCD-1234' }).success).toBe(true)
            expect(verifyUserCodeSchema.safeParse({ userCode: '' }).success).toBe(false)
        })
    })
})
