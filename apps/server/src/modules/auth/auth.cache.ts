import { redisClient } from '../../config/redis'

import type { CachedSessionData } from './auth.types'

interface CacheEntry {
    data: CachedSessionData
    expiresAt: number
}

const DEFAULT_TTL_MS = 15 * 1000 // 15 seconds short TTL for L1 in-memory map
const REDIS_TTL_MS = 15 * 60 * 1000 // 15 minutes TTL for L2 Redis cache

class SessionCache {
    private cache = new Map<string, CacheEntry>()

    async get(sessionId: string): Promise<CachedSessionData | null> {
        const entry = this.cache.get(sessionId)
        if (entry && Date.now() <= entry.expiresAt) {
            return entry.data
        }

        if (redisClient) {
            try {
                const dataStr = await redisClient.get(`sess:cache:${sessionId}`)
                if (dataStr) {
                    const parsed = JSON.parse(dataStr) as CachedSessionData
                    if (parsed.expiresAt) {
                        parsed.expiresAt = new Date(parsed.expiresAt)
                    }
                    this.cache.set(sessionId, {
                        data: parsed,
                        expiresAt: Date.now() + DEFAULT_TTL_MS,
                    })
                    return parsed
                }
            } catch (err) {
                console.error('[SessionCache Redis Get Error]', err)
            }
        }

        return null
    }

    async set(sessionId: string, data: CachedSessionData, ttlMs = REDIS_TTL_MS): Promise<void> {
        this.cache.set(sessionId, {
            data,
            expiresAt: Date.now() + DEFAULT_TTL_MS,
        })

        if (redisClient) {
            try {
                const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000))
                await redisClient.set(`sess:cache:${sessionId}`, JSON.stringify(data), 'EX', ttlSec)
                if (data.userId) {
                    await redisClient.sadd(`user:sessions:${data.userId}`, sessionId)
                    await redisClient.expire(`user:sessions:${data.userId}`, 30 * 24 * 60 * 60)
                }
            } catch (err) {
                console.error('[SessionCache Redis Set Error]', err)
            }
        }
    }

    async invalidate(sessionId: string): Promise<void> {
        this.cache.delete(sessionId)
        if (redisClient) {
            try {
                await redisClient.del(`sess:cache:${sessionId}`)
            } catch (err) {
                console.error('[SessionCache Redis Invalidate Error]', err)
            }
        }
    }

    async invalidateUser(userId: string): Promise<void> {
        for (const [sessionId, entry] of this.cache.entries()) {
            if (entry.data.userId === userId) {
                this.cache.delete(sessionId)
            }
        }
        if (redisClient) {
            try {
                const sessionIds = await redisClient.smembers(`user:sessions:${userId}`)
                if (sessionIds.length > 0) {
                    const keys = sessionIds.map((id) => `sess:cache:${id}`)
                    await redisClient.del(...keys)
                    await redisClient.del(`user:sessions:${userId}`)
                }
            } catch (err) {
                console.error('[SessionCache Redis InvalidateUser Error]', err)
            }
        }
    }

    clear(): void {
        this.cache.clear()
    }
}

export const sessionCache = new SessionCache()
