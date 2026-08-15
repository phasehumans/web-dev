import crypto from 'crypto'

import jwt, { type SignOptions } from 'jsonwebtoken'

import resend from '../../config/email'
import { env } from '../../env'

import { renderOtpEmail, type OtpType } from './templates/otp.template'
import { renderWelcomeEmail } from './templates/welcome.template'

import type { TokenPayload } from './auth.types'

export const hashRefreshToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export const getNameFromEmail = (email: string): string => {
    if (!email) return ''
    const parts = email.split('@')
    if (parts.length < 2 || !parts[0]) return ''
    const localPart = parts[0]
    return localPart.replace(/\d/g, '')
}

export const generateUserCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `${result.substring(0, 4)}-${result.substring(4, 8)}`
}

export const sendOTP = async (email: string, otp: string, type: OtpType = 'verification') => {
    const fromEmail = env.SENDER_EMAIL || 'onboarding@resend.dev'
    const webUrl = env.WEB_URL || 'https://trydecember.com'

    const { subject, html, text } = renderOtpEmail({
        otp,
        type,
        supportEmail: fromEmail,
        webUrl,
    })

    try {
        await resend.emails.send({
            from: `December <${fromEmail}>`,
            to: email,
            subject,
            html,
            text,
        })
    } catch (error) {
        console.error(`[Email Service] Failed to send OTP email to ${email}:`, error)
        if (env.ENV === 'DEV') {
            console.log(`[DEV OTP Code] Verification code for ${email} is: ${otp}`)
        }
    }
}

export const sendWelcomeEmail = async (email: string, name: string) => {
    const fromEmail = env.SENDER_EMAIL || 'onboarding@resend.dev'
    const webUrl = env.WEB_URL || 'https://trydecember.com'
    const docsUrl = env.DOCS_URL || `${webUrl}/docs`

    const { subject, html, text } = renderWelcomeEmail({
        name,
        supportEmail: fromEmail,
        webUrl,
        docsUrl,
    })

    try {
        await resend.emails.send({
            from: `December <${fromEmail}>`,
            to: email,
            subject,
            html,
            text,
        })
    } catch (error) {
        console.error(`[Email Service] Failed to send Welcome email to ${email}:`, error)
    }
}

export const generateAccessToken = (payload: TokenPayload) => {
    const secret = env.ACCESS_TOKEN_SECRET
    const expiresIn = env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn']

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            jti: crypto.randomUUID(),
        },
        secret,
        {
            expiresIn,
        }
    )
}

export const generateRefreshToken = (payload: TokenPayload) => {
    const secret = env.REFRESH_TOKEN_SECRET
    const expiresIn = env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn']

    return jwt.sign(
        {
            userId: payload.userId,
            sessionId: payload.sessionId,
            jti: crypto.randomUUID(),
        },
        secret,
        {
            expiresIn,
        }
    )
}

export const verifyAccessToken = (token: string) => {
    const secret = env.ACCESS_TOKEN_SECRET
    return jwt.verify(token, secret) as TokenPayload
}

export const verifyRefreshToken = (token: string) => {
    const secret = env.REFRESH_TOKEN_SECRET
    return jwt.verify(token, secret) as TokenPayload
}

export const extractToken = (req: {
    headers: Record<string, any>
    cookies?: Record<string, any>
}): string | undefined => {
    const authHeader = req.headers.authorization
    if (authHeader && typeof authHeader === 'string') {
        const [scheme, extractedToken] = authHeader.split(' ')
        if (scheme === 'Bearer' && extractedToken) {
            return extractedToken
        }
    }
    return req.cookies?.accessToken
}
