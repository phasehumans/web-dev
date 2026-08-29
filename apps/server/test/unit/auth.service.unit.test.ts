import { describe, it, expect } from 'bun:test'

import { authRepository } from '../../src/modules/auth/auth.repository'
import { authService } from '../../src/modules/auth/auth.service'
import { AppError } from '../../src/shared/appError'

describe('Auth Service - Unit Tests', () => {
    describe('signup', () => {
        it('should throw AppError 400 if user exists with social login (no password)', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'user-1',
                email: 'social@example.com',
                password: null,
                emailVerified: true,
            })) as any

            try {
                await expect(
                    authService.signup({ email: 'social@example.com', password: 'Password123!' })
                ).rejects.toThrow(new AppError('account exists with social login', 400))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })

        it('should throw AppError 409 if user exists and email is already verified', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'user-2',
                email: 'verified@example.com',
                password: 'hashed-password',
                emailVerified: true,
            })) as any

            try {
                await expect(
                    authService.signup({ email: 'verified@example.com', password: 'Password123!' })
                ).rejects.toThrow(new AppError('email already exists', 409))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })
    })

    describe('verifyOtp', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => null) as any

            try {
                await expect(
                    authService.verifyOtp({ email: 'unknown@example.com', otp: '123456' })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })

        it('should throw AppError 403 if user is marked as deleted', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'deleted-user',
                email: 'deleted@example.com',
                isDeleted: true,
            })) as any

            try {
                await expect(
                    authService.verifyOtp({ email: 'deleted@example.com', otp: '123456' })
                ).rejects.toThrow(new AppError('account has been deleted', 403))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })

        it('should throw AppError 400 if user email is already verified', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'verified-user',
                email: 'verified@example.com',
                isDeleted: false,
                emailVerified: true,
            })) as any

            try {
                await expect(
                    authService.verifyOtp({ email: 'verified@example.com', otp: '123456' })
                ).rejects.toThrow(new AppError('email already verified', 400))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })

        it('should throw AppError 400 if OTP is not found', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'no-otp-user',
                email: 'nootp@example.com',
                isDeleted: false,
                emailVerified: false,
                otpHash: null,
                otpExpiresAt: null,
            })) as any

            try {
                await expect(
                    authService.verifyOtp({ email: 'nootp@example.com', otp: '123456' })
                ).rejects.toThrow(new AppError('otp not found, request new one', 400))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })
    })

    describe('login', () => {
        it('should throw AppError 401 for non-existent user email', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => null) as any

            try {
                await expect(
                    authService.login({
                        email: 'nonexistent@example.com',
                        password: 'Password123!',
                    })
                ).rejects.toThrow(new AppError('invalid email or password', 401))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })

        it('should throw AppError 401 if email is unverified', async () => {
            const originalFind = authRepository.findUserByEmail
            authRepository.findUserByEmail = (async () => ({
                id: 'unverified-user',
                email: 'unverified@example.com',
                emailVerified: false,
            })) as any

            try {
                await expect(
                    authService.login({ email: 'unverified@example.com', password: 'Password123!' })
                ).rejects.toThrow(new AppError('please verify your email', 401))
            } finally {
                authRepository.findUserByEmail = originalFind
            }
        })
    })

    describe('refreshSession', () => {
        it('should throw AppError 401 if token is missing', async () => {
            await expect(authService.refreshSession({})).rejects.toThrow(
                new AppError('token is required', 401)
            )
        })

        it('should throw AppError 401 if token is invalid JWT', async () => {
            await expect(
                authService.refreshSession({ refreshToken: 'invalid-jwt' })
            ).rejects.toThrow(new AppError('invalid or expired token', 401))
        })
    })

    describe('deleteAccount', () => {
        it('should throw AppError 404 if user to delete is not found', async () => {
            const originalFind = authRepository.findUserByIdForDeleteCheck
            authRepository.findUserByIdForDeleteCheck = (async () => null) as any

            try {
                await expect(authService.deleteAccount({ userId: 'non-existent' })).rejects.toThrow(
                    new AppError('user not found', 404)
                )
            } finally {
                authRepository.findUserByIdForDeleteCheck = originalFind
            }
        })

        it('should throw AppError 409 if user account is already deleted', async () => {
            const originalFind = authRepository.findUserByIdForDeleteCheck
            authRepository.findUserByIdForDeleteCheck = (async () => ({
                id: 'deleted-id',
                isDeleted: true,
            })) as any

            try {
                await expect(authService.deleteAccount({ userId: 'deleted-id' })).rejects.toThrow(
                    new AppError('user account is already deleted', 409)
                )
            } finally {
                authRepository.findUserByIdForDeleteCheck = originalFind
            }
        })
    })

    describe('pollDeviceToken & verifyUserCode', () => {
        it('pollDeviceToken throws AppError invalid_client if device code not found', async () => {
            const originalFind = authRepository.findDeviceCodeByDeviceCode
            authRepository.findDeviceCodeByDeviceCode = (async () => null) as any

            try {
                await expect(
                    authService.pollDeviceToken({ deviceCode: 'invalid' })
                ).rejects.toThrow(new AppError('invalid_client', 400))
            } finally {
                authRepository.findDeviceCodeByDeviceCode = originalFind
            }
        })

        it('verifyUserCode throws AppError Invalid code if user code not found', async () => {
            const originalFind = authRepository.findDeviceCodeByUserCode
            authRepository.findDeviceCodeByUserCode = (async () => null) as any

            try {
                await expect(
                    authService.verifyUserCode({ userCode: 'INVALID', userId: 'u-1' })
                ).rejects.toThrow(new AppError('Invalid code', 404))
            } finally {
                authRepository.findDeviceCodeByUserCode = originalFind
            }
        })
    })
})
