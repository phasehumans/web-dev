import crypto from 'crypto'

import bcrypt from 'bcrypt'

import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { getUsername } from '../../shared/username'
import { notificationService } from '../notification/notification.service'

import { sessionCache } from './auth.cache'
import { authRepository } from './auth.repository'
import {
    sendOTP,
    sendWelcomeEmail,
    generateUserCode,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
} from './auth.utils'

import type {
    VerifyOtp,
    Login,
    Google,
    Github,
    Signup,
    RefreshSession,
    RequestPasswordReset,
    VerifyPasswordResetOtp,
    ResetPassword,
    Signout,
    SignoutAll,
    DeleteAccount,
    GetCliToken,
    PollDeviceToken,
    VerifyUserCode,
    PurgeSessions,
} from './auth.types'

const signup = async (data: Signup) => {
    const { email, password } = data

    const existingUser = await authRepository.findUserByEmail(email)

    if (existingUser) {
        if (!existingUser.password) {
            throw new AppError('account exists with social login', 400)
        }
        if (existingUser.emailVerified) {
            throw new AppError('email already exists', 409)
        }

        const hashPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)
        const otp = crypto.randomInt(100000, 1000000).toString()
        const otpHash = await bcrypt.hash(otp, env.BCRYPT_SALT_ROUNDS)

        await authRepository.updateUser(existingUser.id, {
            password: hashPassword,
            otpHash,
            otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        })

        await sendOTP(existingUser.email, otp, 'signup')

        return { message: 'otp sent successfully' }
    }

    let name = email.split('@')[0]?.replace(/\d+/g, '')
    const username = getUsername()

    if (!name) {
        name = username
    }

    const hashPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)
    const otp = crypto.randomInt(100000, 1000000).toString()
    const otpHash = await bcrypt.hash(otp, env.BCRYPT_SALT_ROUNDS)

    const newUser = await authRepository.createUser({
        name: name,
        email: email,
        username: username,
        password: hashPassword,
        emailVerified: false,
        otpHash: otpHash,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })

    await sendOTP(newUser.email, otp, 'signup')

    return { message: 'otp sent successfully' }
}

const verifyOtp = async (data: VerifyOtp) => {
    const { email, otp, userAgent, ipAddress } = data

    const user = await authRepository.findUserByEmail(email)

    if (!user) {
        throw new AppError('user not found', 404)
    }

    if (user.deletedAt || user.isDeleted) {
        throw new AppError('account has been deleted', 403)
    }

    if (user.emailVerified) {
        throw new AppError('email already verified', 400)
    }

    if (!user.otpHash || !user.otpExpiresAt) {
        throw new AppError('otp not found, request new one', 400)
    }

    if (user.otpExpiresAt < new Date()) {
        await authRepository.updateUser(user.id, {
            otpHash: null,
            otpExpiresAt: null,
        })

        throw new AppError('otp expired', 401)
    }

    const isValid = await bcrypt.compare(otp, user.otpHash)

    if (!isValid) {
        throw new AppError('invalid otp', 401)
    }

    await authRepository.updateUser(user.id, {
        emailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
    })

    const sessionId = crypto.randomUUID()

    const accessToken = generateAccessToken({
        userId: user.id,
        sessionId,
    })

    const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId,
    })

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await authRepository.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash: refreshTokenHash,
        userAgent: userAgent,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    try {
        await notificationService.sendNotificationToUser({
            userId: user.id,
            title: 'Welcome to December',
            message:
                'Your account has been created successfully. You can now start building apps and turn your ideas into reality with December.',
            type: 'SUCCESS',
        })
    } catch (error) {
        console.error('failed to send welcome notification:', error)
    }

    try {
        await sendWelcomeEmail(user.email, user.name || '')
    } catch (error) {
        console.error('failed to send welcome email:', error)
    }
    return {
        accessToken,
        refreshToken,
    }
}

const login = async (data: Login) => {
    const { email, password, userAgent, ipAddress } = data

    const existingUser = await authRepository.findUserByEmail(email)

    if (!existingUser) {
        throw new AppError('invalid email or password', 401)
    }

    if (existingUser.deletedAt || existingUser.isDeleted) {
        throw new AppError('account has been deleted', 401)
    }

    if (!existingUser.emailVerified) {
        throw new AppError('please verify your email', 401)
    }

    if (!existingUser.password) {
        throw new AppError('please continue with google login', 401)
    }

    const isPasswordMatch = await bcrypt.compare(password, existingUser.password)

    if (!isPasswordMatch) {
        throw new AppError('invalid email or password', 401)
    }

    const sessionId = crypto.randomUUID()

    const accessToken = generateAccessToken({
        userId: existingUser.id,
        sessionId,
    })

    const refreshToken = generateRefreshToken({
        userId: existingUser.id,
        sessionId,
    })

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await authRepository.createSession({
        id: sessionId,
        userId: existingUser.id,
        refreshTokenHash: refreshTokenHash,
        userAgent: userAgent,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return {
        accessToken,
        refreshToken,
    }
}

const requestPasswordReset = async (data: RequestPasswordReset) => {
    const { email } = data
    const user = await authRepository.findUserByEmail(email)

    if (!user || user.deletedAt || user.isDeleted || !user.emailVerified) {
        return
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    const otpHash = await bcrypt.hash(otp, env.BCRYPT_SALT_ROUNDS)

    await authRepository.updateUser(user.id, {
        otpHash,
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })

    await sendOTP(user.email, otp, 'password_reset')
}

const verifyPasswordResetOtp = async (data: VerifyPasswordResetOtp) => {
    const { email, otp } = data
    const user = await authRepository.findUserByEmail(email)

    if (!user || user.deletedAt || user.isDeleted || !user.emailVerified) {
        throw new AppError('invalid or expired reset code', 401)
    }

    if (!user.otpHash || !user.otpExpiresAt) {
        throw new AppError('invalid or expired reset code', 401)
    }

    if (user.otpExpiresAt < new Date()) {
        await authRepository.updateUser(user.id, {
            otpHash: null,
            otpExpiresAt: null,
        })

        throw new AppError('invalid or expired reset code', 401)
    }

    const isValid = await bcrypt.compare(otp, user.otpHash)

    if (!isValid) {
        throw new AppError('invalid or expired reset code', 401)
    }

    return user
}

const resetPassword = async (data: ResetPassword) => {
    const { email, otp, newPassword } = data

    const user = await authRepository.findUserByEmail(email)

    if (!user || user.deletedAt || user.isDeleted || !user.emailVerified) {
        throw new AppError('invalid or expired reset code', 401)
    }

    if (!user.otpHash || !user.otpExpiresAt) {
        throw new AppError('invalid or expired reset code', 401)
    }

    if (user.otpExpiresAt < new Date()) {
        await authRepository.updateUser(user.id, {
            otpHash: null,
            otpExpiresAt: null,
        })

        throw new AppError('invalid or expired reset code', 401)
    }

    const isValid = await bcrypt.compare(otp, user.otpHash)

    if (!isValid) {
        throw new AppError('invalid or expired reset code', 401)
    }

    const password = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS)

    await authRepository.resetPasswordAndRevokeSessions(user.id, password)
    await sessionCache.invalidateUser(user.id)
}

const google = async (data: Google) => {
    const { name, email, sub, userAgent, ipAddress } = data

    let user = await authRepository.findUserByEmail(email)

    if (!user) {
        const username = getUsername()
        user = await authRepository.createUser({
            email: email,
            username: username,
            emailVerified: true,
            googleId: sub,
            name: name,
        })

        try {
            await notificationService.sendNotificationToUser({
                userId: user.id,
                title: 'Welcome to December',
                message:
                    'Your account has been created successfully. You can now start building apps and turn your ideas into reality with December.',
                type: 'SUCCESS',
            })
        } catch (error) {
            console.error('failed to send welcome notification:', error)
        }

        try {
            await sendWelcomeEmail(user.email, user.name || '')
        } catch (error) {
            console.error('failed to send welcome email:', error)
        }
    } else if (user.deletedAt || user.isDeleted) {
        throw new AppError('account has been deleted', 403)
    } else if (!user.googleId) {
        user = await authRepository.updateUser(user.id, {
            googleId: sub,
            emailVerified: true,
            otpHash: null,
            otpExpiresAt: null,
        })
    } else if (user.googleId !== sub) {
        throw new AppError('google id mismatch', 400)
    }

    const sessionId = crypto.randomUUID()

    const accessToken = generateAccessToken({
        userId: user.id,
        sessionId,
    })

    const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId,
    })

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await authRepository.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        userAgent: userAgent,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return {
        accessToken,
        refreshToken,
    }
}

const github = async (data: Github) => {
    const { name, email, sub, username: ghUsername, userAgent, ipAddress } = data

    let user = await authRepository.findUserByEmail(email)

    if (!user) {
        const username = getUsername()
        user = await authRepository.createUser({
            email: email,
            username: username,
            emailVerified: true,
            githubId: sub,
            name: name,
        })

        if (ghUsername) {
            user = await authRepository.updateUser(user.id, {
                githubUsername: ghUsername,
            })
        }

        try {
            await notificationService.sendNotificationToUser({
                userId: user.id,
                title: 'Welcome to December',
                message:
                    'Your account has been created successfully. You can now start building apps and turn your ideas into reality with December.',
                type: 'SUCCESS',
            })
        } catch (error) {
            console.error('failed to send welcome notification:', error)
        }

        try {
            await sendWelcomeEmail(user.email, user.name || '')
        } catch (error) {
            console.error('failed to send welcome email:', error)
        }
    } else if (user.deletedAt || user.isDeleted) {
        throw new AppError('account has been deleted', 403)
    } else if (!user.githubId) {
        user = await authRepository.updateUser(user.id, {
            githubId: sub,
            githubUsername: ghUsername || user.githubUsername,
            emailVerified: true,
            otpHash: null,
            otpExpiresAt: null,
        })
    } else if (user.githubId !== sub) {
        throw new AppError('github id mismatch', 400)
    } else if (ghUsername && user.githubUsername !== ghUsername) {
        user = await authRepository.updateUser(user.id, {
            githubUsername: ghUsername,
        })
    }

    const sessionId = crypto.randomUUID()

    const accessToken = generateAccessToken({
        userId: user.id,
        sessionId,
    })

    const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId,
    })

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await authRepository.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        userAgent: userAgent,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    return {
        accessToken,
        refreshToken,
        user,
    }
}

const REFRESH_GRACE_PERIOD_MS = 60 * 1000

const refreshSession = async (data: RefreshSession) => {
    const { refreshToken } = data

    if (!refreshToken) {
        throw new AppError('refresh token is required', 401)
    }

    let payload: { userId: string; sessionId: string }

    try {
        payload = verifyRefreshToken(refreshToken)
    } catch {
        throw new AppError('invalid or expired refresh token', 401)
    }

    const { userId, sessionId } = payload

    const session = await authRepository.findSessionById(sessionId)

    if (!session) {
        throw new AppError('session not found', 401)
    }

    if (session.isRevoked) {
        throw new AppError('session revoked', 401)
    }

    if (session.userId !== userId) {
        await authRepository.deleteSessionsBySessionId(session.id)
        await sessionCache.invalidate(session.id)
        throw new AppError('invalid session', 401)
    }

    if (session.expiresAt.getTime() <= Date.now()) {
        await authRepository.deleteSessionsBySessionId(session.id)
        await sessionCache.invalidate(session.id)
        throw new AppError('session expired', 401)
    }

    const incomingHash = hashRefreshToken(refreshToken)
    const isCurrentToken = session.refreshTokenHash === incomingHash

    const isPreviousTokenWithinGrace =
        session.previousRefreshTokenHash === incomingHash &&
        session.rotatedAt &&
        Date.now() - session.rotatedAt.getTime() <= REFRESH_GRACE_PERIOD_MS

    if (!isCurrentToken && !isPreviousTokenWithinGrace) {
        throw new AppError('invalid refresh token', 401)
    }

    const user = await authRepository.findUserById(userId)

    if (!user) {
        await authRepository.deleteSessionsBySessionId(session.id)
        await sessionCache.invalidate(session.id)
        throw new AppError('user not found', 401)
    }

    if (user.deletedAt || user.isDeleted) {
        await authRepository.deleteSessionsBySessionId(session.id)
        await sessionCache.invalidate(session.id)
        throw new AppError('account no longer exists', 401)
    }

    const accessToken = generateAccessToken({
        userId: user.id,
        sessionId: session.id,
    })

    if (isPreviousTokenWithinGrace) {
        return {
            accessToken,
        }
    }

    const newRefreshToken = generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
    })

    const newRefreshTokenHash = hashRefreshToken(newRefreshToken)

    await authRepository.updateSession(session.id, {
        previousRefreshTokenHash: incomingHash,
        rotatedAt: new Date(),
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    await sessionCache.invalidate(session.id)

    return {
        accessToken,
        refreshToken: newRefreshToken,
    }
}

const signout = async (data: Signout) => {
    const { userId, sessionId } = data

    const existingSession = await authRepository.findSessionById(sessionId)

    if (!existingSession || existingSession.userId !== userId) {
        return
    }

    await authRepository.revokeSession(sessionId)
    await sessionCache.invalidate(sessionId)
}

const signoutAll = async (data: SignoutAll) => {
    const { userId } = data

    await authRepository.revokeAllSessions(userId)
    await sessionCache.invalidateUser(userId)
}

const deleteAccount = async (data: DeleteAccount) => {
    const { userId } = data

    const existingUser = await authRepository.findUserByIdForDeleteCheck(userId)

    if (!existingUser) {
        throw new AppError('user not found', 404)
    }

    if (existingUser.isDeleted) {
        throw new AppError('user account is already deleted', 409)
    }

    await authRepository.deleteAccount(userId)
    await sessionCache.invalidateUser(userId)
}

const getCliToken = async (data: GetCliToken) => {
    const { token: _token, userId } = data
    const user = await authRepository.findUserById(userId)

    if (!user) {
        throw new AppError('User not found', 404)
    }

    const sessionId = crypto.randomUUID()
    const refreshToken = generateRefreshToken({ userId: user.id, sessionId })
    const refreshTokenHash = hashRefreshToken(refreshToken)

    await authRepository.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        userAgent: 'cli-token',
        ipAddress: 'unknown',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    const token = generateAccessToken({ userId: user.id, sessionId }, { expiresIn: '30d' })

    return { token, email: user.email }
}

const generateDeviceCode = async () => {
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const deviceCode = crypto.randomBytes(32).toString('hex')
        const userCode = generateUserCode()
        const expiresIn = 900 // 15 minutes

        try {
            await authRepository.createDeviceCode({
                deviceCode,
                userCode,
                expiresAt: new Date(Date.now() + expiresIn * 1000),
                status: 'PENDING',
            })

            return {
                deviceCode,
                userCode,
                verificationUri: `${process.env.WEB_URL || 'https://trydecember.com'}/activate`,
                expiresIn,
                interval: 5,
            }
        } catch (error: any) {
            // prisma unique constraint violation — retry with a new code
            if (error?.code === 'P2002' && attempt < maxRetries - 1) {
                continue
            }
            throw error
        }
    }

    throw new AppError('failed to generate device code', 500)
}

const pollDeviceToken = async (data: PollDeviceToken) => {
    const { deviceCode, userAgent, ipAddress } = data

    const codeRecord = await authRepository.findDeviceCodeByDeviceCode(deviceCode)

    if (!codeRecord) {
        throw new AppError('invalid_client', 400)
    }

    if (codeRecord.expiresAt < new Date()) {
        await authRepository.updateDeviceCode(codeRecord.id, { status: 'EXPIRED' })
        throw new AppError('expired_token', 400)
    }

    if (codeRecord.status === 'PENDING') {
        throw new AppError('authorization_pending', 400)
    }

    if (codeRecord.status === 'APPROVED' && codeRecord.userId) {
        const user = await authRepository.findUserById(codeRecord.userId)

        if (!user) {
            throw new AppError('User not found', 404)
        }

        const sessionId = crypto.randomUUID()
        const refreshToken = generateRefreshToken({ userId: user.id, sessionId })
        const refreshTokenHash = hashRefreshToken(refreshToken)

        await authRepository.createSession({
            id: sessionId,
            userId: user.id,
            refreshTokenHash,
            userAgent: userAgent || 'device-cli',
            ipAddress: ipAddress || 'unknown',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })

        const accessToken = generateAccessToken(
            { userId: user.id, sessionId },
            { expiresIn: '30d' }
        )

        await authRepository.deleteDeviceCode(codeRecord.id)

        return {
            token: accessToken,
            email: user.email,
        }
    }

    throw new AppError('authorization_pending', 400)
}

const verifyUserCode = async (data: VerifyUserCode) => {
    const { userCode, userId } = data

    const codeRecord = await authRepository.findDeviceCodeByUserCode(userCode)

    if (!codeRecord) {
        throw new AppError('Invalid code', 404)
    }

    if (codeRecord.expiresAt < new Date()) {
        throw new AppError('This code has expired', 400)
    }

    if (codeRecord.status !== 'PENDING') {
        throw new AppError('This code is no longer pending', 400)
    }

    await authRepository.updateDeviceCode(codeRecord.id, {
        status: 'APPROVED',
        user: { connect: { id: userId } },
    })
}

const purgeExpiredAndRevokedSessions = async (data: PurgeSessions = {}) => {
    void data
    return authRepository.purgeExpiredAndRevokedSessions()
}

const startSessionCleanupScheduler = (intervalMs = 60 * 60 * 1000) => {
    const timer = setInterval(async () => {
        try {
            await purgeExpiredAndRevokedSessions()
        } catch (error) {
            console.error('Session cleanup scheduler failed:', error)
        }
    }, intervalMs)
    if (timer.unref) {
        timer.unref()
    }
    return timer
}

export const authService = {
    signup,
    verifyOtp,
    login,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resetPassword,
    google,
    github,
    refreshSession,
    signout,
    signoutAll,
    deleteAccount,
    getCliToken,
    generateDeviceCode,
    pollDeviceToken,
    verifyUserCode,
    purgeExpiredAndRevokedSessions,
    startSessionCleanupScheduler,
}
