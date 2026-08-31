import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { httpLogger } from './config/logger'
import { env } from './env'
import { parseAuthToken } from './middleware/auth.middleware'
import { errorHandler } from './middleware/error.middleware'
import { cliRateLimiter, globalRateLimiter, runtimeRateLimiter } from './middleware/rate-limiter'
import authRouter from './modules/auth/auth.routes'
import billingRouter from './modules/billing/billing.routes'
import cliRouter from './modules/cli/cli.routes'
import coreRouter from './modules/core/core.routes'
import githubAppRouter from './modules/githubapp/githubapp.routes'
import integrationsRouter from './modules/integration/integration.routes'
import notificationRouter from './modules/notification/notification.routes'
import importRouter from './modules/platform/import/import.routes'
import platformRouter from './modules/platform/platform.routes'
import runtimeRouter from './modules/runtime/runtime.routes'
import secretsRouter from './modules/secrets/secrets.routes'
import sessionRouter from './modules/session/session.routes'
import settingRouter from './modules/setting/setting.routes'
import usageRouter from './modules/usage/usage.routes'

const app = express()

app.use(helmet())
app.set('trust proxy', true)
app.use(httpLogger)

app.use(
    express.json({
        limit: '25mb',
        verify: (req: any, _res, buf) => {
            req.rawBody = buf
        },
    })
)
app.use(cookieParser())
app.use(express.urlencoded({ extended: true, limit: '25mb' }))
const allowedOrigins = [
    env.WEB_URL?.replace(/\/+$/, ''),
    'https://trydecember.com',
    'https://www.trydecember.com',
    ...(env.NODE_ENV !== 'production'
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000']
        : []),
].filter(Boolean) as string[]

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || (env.NODE_ENV !== 'production' && origin === 'null')) {
                return callback(null, true)
            }
            if (
                allowedOrigins.includes(origin) ||
                origin.endsWith('.vercel.app') ||
                (env.NODE_ENV !== 'production' &&
                    (origin.includes('localhost') || origin.includes('127.0.0.1')))
            ) {
                return callback(null, true)
            }
            return callback(null, false)
        },
        credentials: true,
    })
)

// Unauthenticated Health Check Endpoints for ALB / CloudWatch / Docker / Monitoring
const healthCheckHandler = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'december-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    })
}

app.get('/health', healthCheckHandler)
app.get('/api/health', healthCheckHandler)
app.get('/api/v1/health', healthCheckHandler)

// Pre-parse token context for user-aware rate limiting and auth routing
app.use(parseAuthToken)

// Mount auth router before global rate limiter so auth endpoints (signup, login, otp, etc.)
// are governed exclusively by their dedicated strict rate limiters (authRateLimiter, refreshRateLimiter)
// and are not blocked by generic API traffic quota exhaustion.
app.use('/api/v1/auth', authRouter)

// Apply global baseline rate limiter to all other API endpoints
app.use('/api', globalRateLimiter)

app.use('/api/v1/setting', settingRouter)

app.use('/api/v1/runtime', runtimeRateLimiter, runtimeRouter)
app.use('/api/v1/upload', importRouter)
app.use('/api/v1/usage', usageRouter)
app.use('/api/v1/integrations', integrationsRouter)
app.use('/api/v1/notification', notificationRouter)
app.use('/api/v1/billing', billingRouter)
app.use('/api/v1/platform', platformRouter)
app.use('/api/v1/cli', cliRateLimiter, cliRouter)
app.use('/api/v1/session', sessionRouter)
app.use('/api/v1/sessions', sessionRouter)
app.use('/api/v1/secrets', secretsRouter)
app.use('/api/v1/githubapp', githubAppRouter)

app.use('/api/v1/core', coreRouter)
app.use(errorHandler)

export default app
