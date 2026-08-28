import axios from 'axios'
import { OAuth2Client } from 'google-auth-library'

import { env } from '../../env'
import { AppError } from '../../shared/appError'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'

import { authCookie } from './auth.cookie'
import {
    forgotPasswordRequestSchema,
    forgotPasswordResetSchema,
    forgotPasswordVerifySchema,
    loginSchema,
    signupSchema,
    verifyOtpSchema,
    googleAuthSchema,
    githubAuthSchema,
    pollDeviceTokenSchema,
    verifyUserCodeSchema,
} from './auth.schema'
import { authService } from './auth.service'

import type { Request, Response } from 'express'

const signup = asyncHandler(async (req: Request, res: Response) => {
    const parseData = signupSchema.parse(req.body)
    const result = await authService.signup(parseData)
    return sendSuccess(res, 'otp sent to email', result, 201)
})

const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const parseData = verifyOtpSchema.parse(req.body)
    const { email, otp } = parseData

    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'

    const result = await authService.verifyOtp({ email, otp, userAgent, ipAddress })
    authCookie.setAuthCookies(res, result.accessToken, result.refreshToken)

    return sendSuccess(res, 'email verified successfully', result)
})

const login = asyncHandler(async (req: Request, res: Response) => {
    const parseData = loginSchema.parse(req.body)

    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'

    const result = await authService.login({ ...parseData, userAgent, ipAddress })
    authCookie.setAuthCookies(res, result.accessToken, result.refreshToken)

    return sendSuccess(res, 'login successful', result)
})

const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const parseData = forgotPasswordRequestSchema.parse(req.body)
    await authService.requestPasswordReset(parseData)

    return sendSuccess(res, 'if an account exists, a reset code has been sent')
})

const verifyPasswordResetOtp = asyncHandler(async (req: Request, res: Response) => {
    const parseData = forgotPasswordVerifySchema.parse(req.body)
    await authService.verifyPasswordResetOtp(parseData)

    return sendSuccess(res, 'otp verified successfully')
})

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const parseData = forgotPasswordResetSchema.parse(req.body)
    await authService.resetPassword(parseData)

    return sendSuccess(res, 'password reset successfully')
})

const google = asyncHandler(async (req: Request, res: Response) => {
    const parseData = googleAuthSchema.parse(req.body)
    const { code, credential } = parseData

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw new AppError('google auth is not configured on server', 500)
    }

    let id_token: string | undefined = credential

    if (!id_token && code) {
        let tokenResponse
        try {
            tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                redirect_uri: 'postmessage',
                grant_type: 'authorization_code',
            })
            id_token = tokenResponse.data?.id_token
        } catch (error: any) {
            const errorMsg =
                error?.response?.data?.error_description ||
                error.message ||
                'google authentication failed'
            throw new AppError(errorMsg.toLowerCase(), 400)
        }
    }

    if (!id_token) throw new AppError('google id token not found', 400)

    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    if (!payload) throw new AppError('invalid token payload', 400)

    const { email, name, sub, email_verified } = payload

    if (!email || !name || !sub) throw new AppError('google fields required', 400)
    if (!email_verified) throw new AppError('email not verified', 400)

    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'

    const result = await authService.google({ email, name, sub, userAgent, ipAddress })
    authCookie.setAuthCookies(res, result.accessToken, result.refreshToken)

    return sendSuccess(res, 'login successful', result)
})

const github = asyncHandler(async (req: Request, res: Response) => {
    const parseData = githubAuthSchema.parse(req.body)
    const { code } = parseData

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        throw new AppError('github auth is not configured on server', 500)
    }

    let tokenResponse
    try {
        tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
            },
            {
                headers: {
                    Accept: 'application/json',
                },
            }
        )
    } catch (error: any) {
        const errorMsg =
            error?.response?.data?.error_description ||
            error.message ||
            'github authentication failed'
        throw new AppError(errorMsg.toLowerCase(), 400)
    }

    if (tokenResponse.data?.error) {
        const errorDesc = tokenResponse.data.error_description || tokenResponse.data.error
        throw new AppError(`github oauth error: ${errorDesc}`, 400)
    }

    const { access_token } = tokenResponse.data

    if (!access_token) throw new AppError('github access token not found', 400)

    let userResponse
    try {
        userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })
    } catch (error: any) {
        throw new AppError('failed to fetch github user profile', 400)
    }

    let emailsResponse
    try {
        emailsResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        })
    } catch (error: any) {
        throw new AppError('failed to fetch github user emails', 400)
    }

    if (!Array.isArray(emailsResponse.data)) {
        throw new AppError('failed to fetch github user emails', 400)
    }

    const primaryEmailObj = emailsResponse.data.find((e: any) => e.primary)
    if (!primaryEmailObj) {
        throw new AppError('no primary email found in github account', 400)
    }

    if (!primaryEmailObj.verified) {
        throw new AppError('github primary email is not verified', 400)
    }

    const email = primaryEmailObj.email
    const username = userResponse.data.login
    const name = userResponse.data.name || username
    const sub = String(userResponse.data.id)

    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'

    const result = await authService.github({
        email,
        name,
        sub,
        username,
        userAgent,
        ipAddress,
    })
    authCookie.setAuthCookies(res, result.accessToken, result.refreshToken)

    return sendSuccess(res, 'login successful', result)
})

const refreshSession = asyncHandler(async (req: Request, res: Response) => {
    try {
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken
        const result = await authService.refreshSession({
            refreshToken,
        })

        authCookie.setAccessTokenCookie(res, result.accessToken)
        if (result.refreshToken) {
            authCookie.setRefreshTokenCookie(res, result.refreshToken)
        }

        return sendSuccess(res, 'session refreshed successfully', result)
    } catch (error) {
        if (
            error instanceof AppError &&
            (error.message === 'session revoked' ||
                error.message === 'session expired' ||
                error.message === 'account no longer exists' ||
                error.message === 'account has been deleted' ||
                error.message === 'invalid refresh token' ||
                error.message === 'session not found')
        ) {
            authCookie.clearAuthCookies(res)
        }

        if (error instanceof AppError) {
            throw error
        }

        throw new AppError('failed to refresh session', 401)
    }
})

const signout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId
    const sessionId = req.user?.sessionId

    if (!userId || !sessionId) {
        throw new AppError('unauthorized', 401)
    }

    await authService.signout({ userId, sessionId })
    authCookie.clearAuthCookies(res)

    return sendSuccess(res, 'signed out successfully')
})

const signoutAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    await authService.signoutAll({ userId })
    authCookie.clearAuthCookies(res)

    return sendSuccess(res, 'signed out from all devices successfully')
})

const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId

    if (!userId) {
        throw new AppError('unauthorized', 401)
    }

    await authService.deleteAccount({ userId })
    authCookie.clearAuthCookies(res)

    return sendSuccess(res, 'account deleted successfully')
})

const getCliToken = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization
    const headerToken =
        authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : undefined
    const token = req.cookies?.accessToken || headerToken

    if (!token || !req.user?.userId) {
        throw new AppError('No active session found', 401)
    }

    const result = await authService.getCliToken({ token, userId: req.user.userId })

    return sendSuccess(res, 'cli token retrieved successfully', result)
})

const generateDeviceCode = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.generateDeviceCode()

    return sendSuccess(res, 'Device code generated', result)
})

const pollDeviceToken = asyncHandler(async (req: Request, res: Response) => {
    const parseData = pollDeviceTokenSchema.parse(req.body)

    const userAgent = req.get('user-agent') || 'device-cli'
    const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'

    const result = await authService.pollDeviceToken({ ...parseData, userAgent, ipAddress })

    return sendSuccess(res, 'Token retrieved successfully', result)
})

const verifyUserCode = asyncHandler(async (req: Request, res: Response) => {
    const parseData = verifyUserCodeSchema.parse(req.body)
    const userId = req.user?.userId

    if (!userId) {
        throw new AppError('Unauthorized', 401)
    }

    await authService.verifyUserCode({ ...parseData, userId })

    return sendSuccess(res, 'Device successfully authorized')
})

export const authController = {
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
}
