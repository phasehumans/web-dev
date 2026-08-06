import { describe, it, expect } from 'bun:test'
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'

import app from '../../src/app'
import { createModuleLogger, logger } from '../../src/config/logger'
import { env } from '../../src/env'
import {
    createRateLimiter,
    deviceCodeLimiter,
    deviceTokenPollLimiter,
} from '../../src/middleware/rate-limiter'

describe('Rate Limiter & Structured Logger Middleware Integration', () => {
    it('propagates or generates x-request-id header on HTTP responses', async () => {
        const res = await request(app).get('/api/v1/core/health')
        expect(res.headers['x-request-id']).toBeDefined()
        expect(typeof res.headers['x-request-id']).toBe('string')
    })

    it('preserves incoming x-request-id header when provided by client', async () => {
        const customId = 'test-request-id-12345'
        const res = await request(app).get('/api/v1/core/health').set('x-request-id', customId)
        expect(res.headers['x-request-id']).toBe(customId)
    })

    it('returns rate limit headers (ratelimit-limit, ratelimit-remaining)', async () => {
        const res = await request(app).get('/api/v1/core/health')
        expect(res.headers['ratelimit-limit']).toBeDefined()
        expect(res.headers['ratelimit-remaining']).toBeDefined()
    })

    it('keys clients by userId from JWT authorization header over client IP', async () => {
        const testApp = express()
        testApp.set('trust proxy', true)
        const userLimiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 1,
            message: 'User rate limit reached',
        })

        testApp.use('/user-limit', userLimiter, (_req, res) => {
            res.json({ ok: true })
        })

        const user1Token = jwt.sign({ userId: `rl-user-1-${Date.now()}` }, env.ACCESS_TOKEN_SECRET)
        const user2Token = jwt.sign({ userId: `rl-user-2-${Date.now()}` }, env.ACCESS_TOKEN_SECRET)
        const ip = `10.50.60.${Math.floor(Math.random() * 200) + 1}`

        // Request from User 1 -> 200 OK
        const res1 = await request(testApp)
            .get('/user-limit')
            .set('x-forwarded-for', ip)
            .set('Authorization', `Bearer ${user1Token}`)
        expect(res1.status).toBe(200)

        // Second request from User 1 -> 429 Rate limited
        const res1Blocked = await request(testApp)
            .get('/user-limit')
            .set('x-forwarded-for', ip)
            .set('Authorization', `Bearer ${user1Token}`)
        expect(res1Blocked.status).toBe(429)

        // Request from User 2 from SAME IP -> 200 OK (User 2 has separate quota)
        const res2 = await request(testApp)
            .get('/user-limit')
            .set('x-forwarded-for', ip)
            .set('Authorization', `Bearer ${user2Token}`)
        expect(res2.status).toBe(200)
    })

    it('enforces rate limit and returns 429 payload with dynamic retryAfter when threshold is exceeded', async () => {
        const testApp = express()
        testApp.set('trust proxy', true)
        const strictLimiter = createRateLimiter({
            windowMs: 60 * 1000,
            limit: 2,
            message: 'Strict test limit reached',
        })

        testApp.use('/test-limit', strictLimiter, (_req, res) => {
            res.json({ ok: true })
        })

        const testIp = `10.20.30.${Math.floor(Math.random() * 200) + 1}`

        // Request 1: OK
        const res1 = await request(testApp).get('/test-limit').set('x-forwarded-for', testIp)
        expect(res1.status).toBe(200)

        // Request 2: OK
        const res2 = await request(testApp).get('/test-limit').set('x-forwarded-for', testIp)
        expect(res2.status).toBe(200)

        // Request 3: 429 Exceeded
        const res3 = await request(testApp).get('/test-limit').set('x-forwarded-for', testIp)
        expect(res3.status).toBe(429)
        expect(res3.body.success).toBe(false)
        expect(res3.body.message).toBe('Strict test limit reached')
        expect(res3.body.error).toBeDefined()
        expect(res3.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
        expect(typeof res3.body.error.retryAfter).toBe('number')
        expect(res3.body.error.retryAfter).toBeGreaterThan(0)
    })

    it('exports createModuleLogger and initializes root logger', () => {
        const moduleLogger = createModuleLogger('testModule')
        expect(moduleLogger).toBeDefined()
        expect(logger).toBeDefined()
    })

    it('defines separate rate limiters for device code generation and device token polling', () => {
        expect(deviceCodeLimiter).toBeDefined()
        expect(deviceTokenPollLimiter).toBeDefined()
    })
})
