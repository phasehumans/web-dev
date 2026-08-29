import { prisma } from '@december/database'
import jwt from 'jsonwebtoken'

import { env } from '../env'
import { sessionCache } from '../modules/auth/auth.cache'
import { extractToken } from '../modules/auth/auth.utils'

import type { TokenPayload } from '../modules/auth/auth.types'
import type { Request, Response, NextFunction } from 'express'

export const parseAuthToken = (req: Request, _res: Response, next: NextFunction) => {
    try {
        const token = extractToken(req)
        if (token) {
            const secret = env.ACCESS_TOKEN_SECRET
            const decoded = jwt.verify(token, secret) as TokenPayload | string
            if (typeof decoded !== 'string' && decoded.userId && decoded.sessionId) {
                req.tokenUser = {
                    userId: decoded.userId,
                    sessionId: decoded.sessionId,
                }
                if (!req.user) {
                    req.user = req.tokenUser
                }
            }
        }
    } catch {
        // Intentionally swallowed: optional pre-parsing for downstream rate limiting and routing
    }
    next()
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const isCliRoute =
        req.originalUrl?.includes('/api/v1/cli') ||
        req.baseUrl?.includes('/api/v1/cli') ||
        req.path?.includes('/api/v1/cli')

    const sendAuthError = (status: number, message: string, errors?: any) => {
        return res.status(status).json({
            error: isCliRoute
                ? {
                      message,
                      type: 'authentication_error',
                      code: String(status),
                  }
                : undefined,
            success: false,
            message,
            ...(errors ? { errors } : {}),
        })
    }

    try {
        const token = extractToken(req)

        if (!token) {
            return sendAuthError(401, 'Unauthorized')
        }

        const secret = env.ACCESS_TOKEN_SECRET
        const decoded = jwt.verify(token, secret) as TokenPayload | string

        if (typeof decoded === 'string') {
            return sendAuthError(401, 'Invalid token')
        }

        let session = await sessionCache.get(decoded.sessionId)

        if (!session) {
            session = await prisma.authSession.findUnique({
                where: {
                    id: decoded.sessionId,
                },
                select: {
                    id: true,
                    userId: true,
                    isRevoked: true,
                    expiresAt: true,
                    user: {
                        select: {
                            id: true,
                            isDeleted: true,
                        },
                    },
                },
            })

            if (session) {
                await sessionCache.set(decoded.sessionId, session)
            }
        }

        if (!session) {
            return sendAuthError(401, 'Session not found')
        }

        if (!session.user || session.user.isDeleted) {
            return sendAuthError(401, 'Unauthorized')
        }

        if (session.userId !== decoded.userId) {
            return sendAuthError(401, 'Invalid session')
        }

        if (session.isRevoked) {
            return sendAuthError(401, 'Session revoked')
        }

        const sessionExpiresAt = new Date(session.expiresAt)
        if (sessionExpiresAt < new Date()) {
            return sendAuthError(401, 'Session expired')
        }

        // Sliding session extension: If session has less than 25 days remaining, extend in background
        if (sessionExpiresAt.getTime() - Date.now() < 25 * 24 * 60 * 60 * 1000) {
            const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            prisma.authSession
                .update({
                    where: { id: session.id },
                    data: { expiresAt: newExpiresAt },
                })
                .catch(() => {
                    // Intentionally swallowed: async sliding session extension
                })
            session.expiresAt = newExpiresAt
            sessionCache.set(session.id, session).catch(() => {
                // Intentionally swallowed: async session cache update
            })
        }

        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
        }

        next()
    } catch (error: any) {
        if (error instanceof jwt.TokenExpiredError) {
            return sendAuthError(401, 'Access token expired', error.message)
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return sendAuthError(401, 'Invalid token', error.message)
        }

        return sendAuthError(500, 'Internal server error', error.message)
    }
}
