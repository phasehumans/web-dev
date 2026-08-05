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
    try {
        const token = extractToken(req)

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            })
        }

        const secret = env.ACCESS_TOKEN_SECRET
        const decoded = jwt.verify(token, secret) as TokenPayload | string

        if (typeof decoded === 'string') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            })
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
            return res.status(401).json({
                success: false,
                message: 'Session not found',
            })
        }

        if (!session.user || session.user.isDeleted) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            })
        }

        if (session.userId !== decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session',
            })
        }

        if (session.isRevoked) {
            return res.status(401).json({
                success: false,
                message: 'Session revoked',
            })
        }

        const sessionExpiresAt = new Date(session.expiresAt)
        if (sessionExpiresAt < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Session expired',
            })
        }

        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
        }

        next()
    } catch (error: any) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: 'Access token expired',
                errors: error.message,
            })
        }

        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                errors: error.message,
            })
        }

        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errors: error.message,
        })
    }
}
