import { createRateLimiter as createRateLimiterImpl } from './rate-limiter'

interface RateLimitConfig {
    windowMs: number
    max: number
    message?: string
    prefix?: string
}

export const createRateLimiter = (config: RateLimitConfig) => {
    return createRateLimiterImpl({
        windowMs: config.windowMs,
        limit: config.max,
        message: config.message,
        prefix: config.prefix || 'rl:custom:',
    })
}
