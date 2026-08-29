import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import RedisStore from 'rate-limit-redis'

import { redisClient } from '../config/redis'
import { extractToken } from '../modules/auth/auth.utils'

export interface RateLimiterOptions {
    windowMs?: number
    limit?: number
    max?: number
    message?: string
    prefix?: string
}

export const createRateLimiter = (options: RateLimiterOptions = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000
    const limit = options.limit || options.max || 500
    const message = options.message || 'Too many requests, please try again later.'
    const prefix = options.prefix || 'rl:default:'

    const store = redisClient
        ? new RedisStore({
              // @ts-expect-error ioredis sendCommand signature compatibility
              sendCommand: (...args: string[]) => redisClient!.call(...args),
              prefix,
          })
        : undefined

    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        ...(store ? { store } : {}),
        validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
        keyGenerator: (req) => {
            const user = (req as any).tokenUser || (req as any).user
            if (user?.userId) {
                return `user:${user.userId}`
            }

            const token = extractToken(req) || req.cookies?.refreshToken
            if (token) {
                try {
                    const decoded = jwt.decode(token) as {
                        userId?: string
                    } | null
                    if (decoded?.userId) {
                        return `user:${decoded.userId}`
                    }
                } catch {
                    // Invalid format - fall through to API key / IP keying
                }
            }

            const apiKey = req.headers['x-api-key']
            if (apiKey && typeof apiKey === 'string') {
                return `token:${apiKey}`
            }

            const clientIp = req.ip || req.socket.remoteAddress || 'unknown'
            return `ip:${clientIp}`
        },
        handler: (req, res) => {
            const resetTime = (req as any).rateLimit?.resetTime
            const retryAfterSec =
                resetTime instanceof Date
                    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
                    : Math.ceil(windowMs / 1000)
            res.status(429).json({
                success: false,
                message,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: retryAfterSec,
                },
            })
        },
    })
}

// Global baseline rate limiter (500 req / 15 min)
export const globalRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    message: 'Global API rate limit exceeded',
    prefix: 'rl:global:',
})

// Strict rate limiters for specific sensitive modules
export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    prefix: 'rl:auth:',
})

export const refreshRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: 'Too many session refresh requests, please try again later',
    prefix: 'rl:refresh:',
})

export const runtimeRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    limit: 30,
    message: 'Too many runtime execution requests, please try again in a minute',
    prefix: 'rl:runtime:',
})

export const cliRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    limit: 60,
    message: 'CLI rate limit exceeded',
    prefix: 'rl:cli:',
})

export const deviceCodeLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 5,
    message: 'Too many device code generation requests, please try again after 5 minutes',
    prefix: 'rl:device:',
})

export const deviceTokenPollLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 180,
    message: 'Too many device token polling requests, please try again later',
    prefix: 'rl:device-poll:',
})

// Alias export for backward compatibility
export const apiRateLimiter = globalRateLimiter
