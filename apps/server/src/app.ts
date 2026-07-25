import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { httpLogger } from './config/logger'
import { env } from './env'
import { errorHandler } from './middleware/error.middleware'
import { cliRateLimiter, globalRateLimiter, runtimeRateLimiter } from './middleware/rate-limiter'
import authRouter from './modules/auth/auth.routes'
import billingRouter from './modules/billing/billing.routes'
import canvasRouter from './modules/canvas/canvas.routes'
import cliRouter from './modules/cli/cli.routes'
import coreRouter from './modules/core/core.routes'
import githubAppRouter from './modules/githubapp/githubapp.routes'
import integrationsRouter from './modules/integration/integration.routes'
import notificationRouter from './modules/notification/notification.routes'
import importRouter from './modules/platform/import/import.routes'
import platformRouter from './modules/platform/platform.routes'
import reviewRouter from './modules/review/review.routes'
import runtimeRouter from './modules/runtime/runtime.routes'
import scheduleRouter from './modules/schedule/schedule.routes'
import secretsRouter from './modules/secrets/secrets.routes'
import sessionRouter from './modules/session/session.routes'
import settingRouter from './modules/setting/setting.routes'
import skillsRouter from './modules/skills/skills.routes'
import usageRouter from './modules/usage/usage.routes'
import wikiRouter from './modules/wiki/wiki.routes'

const app = express()

// Enable trust proxy for proper IP resolution behind reverse proxies/load balancers
app.set('trust proxy', true)

// Attach HTTP structured logger
app.use(httpLogger)

app.use(
    express.json({
        limit: '25mb',
    })
)
app.use(cookieParser())
app.use(express.urlencoded({ extended: true, limit: '25mb' }))
app.use(
    cors({
        origin: env.WEB_URL,
        credentials: true,
    })
)

// Apply global baseline rate limiter to all API endpoints
app.use('/api', globalRateLimiter)
app.use('/socket.io', globalRateLimiter)

// Apply strict module rate limiting tiers to sensitive endpoints
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/setting', settingRouter)

app.use('/api/v1/canvas', canvasRouter)
app.use('/api/v1/runtime', runtimeRateLimiter, runtimeRouter)
app.use('/api/v1/upload', importRouter)
app.use('/api/v1/usage', usageRouter)
app.use('/api/v1/integrations', integrationsRouter)
app.use('/api/v1/notification', notificationRouter)
app.use('/api/v1/billing', billingRouter)
app.use('/api/v1/platform', platformRouter)
app.use('/api/v1/cli', cliRateLimiter, cliRouter)
app.use('/api/v1/review', reviewRouter)
app.use('/api/v1/reviews', reviewRouter)
app.use('/api/v1/skills', skillsRouter)
app.use('/api/v1/wiki', wikiRouter)
app.use('/api/wiki', wikiRouter)
app.use('/api/v1/schedule', scheduleRouter)
app.use('/api/v1/session', sessionRouter)
app.use('/api/v1/secrets', secretsRouter)
app.use('/api/v1/githubapp', githubAppRouter)

app.use('/api/v1/core', coreRouter)
app.use(errorHandler)

export default app
