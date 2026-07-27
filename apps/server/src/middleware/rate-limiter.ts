import rateLimit from 'express-rate-limit'
import Redis from 'ioredis'
import jwt from 'jsonwebtoken'
import RedisStore from 'rate-limit-redis'

import { env } from '../env'

let redisClient: Redis | undefined

if (env.REDIS_URL) {
    try {
        redisClient = new Redis(env.REDIS_URL)
    } catch {
        // Fallback to memory store if Redis initialization fails
    }
}

export interface RateLimiterOptions {
    windowMs?: number
    limit?: number
    message?: string
    prefix?: string
}

let instanceCounter = 0

export const createRateLimiter = (options: RateLimiterOptions = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000
    const limit = options.limit || 500
    const message = options.message || 'Too many requests, please try again later.'
    const prefix = options.prefix || `rl:${++instanceCounter}:`

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
            if ((req as any).user?.userId) {
                return `user:${(req as any).user.userId}`
            }
            const authHeader = req.headers.authorization
            if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.substring(7)
                    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as {
                        userId?: string
                    } | null
                    if (decoded?.userId) {
                        return `user:${decoded.userId}`
                    }
                } catch {
                    // Invalid/expired signature - fall through to API key / IP keying
                }
            }
            const apiKey = req.headers['x-api-key']
            if (apiKey && typeof apiKey === 'string') {
                return `token:${apiKey}`
            }
            const rawHeader = req.headers['x-forwarded-for']
            const forwardedIp = Array.isArray(rawHeader)
                ? rawHeader[0]
                : typeof rawHeader === 'string'
                  ? rawHeader.split(',')[0]?.trim()
                  : undefined
            const clientIp = forwardedIp || req.ip || req.socket.remoteAddress || 'unknown'
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
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: 'Too many device code generation requests, please try again after 15 minutes',
    prefix: 'rl:device:',
})

// Alias export for backward compatibility
export const apiRateLimiter = globalRateLimiter
