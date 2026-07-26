import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'
import {
    authRateLimiter,
    refreshRateLimiter,
    deviceCodeLimiter,
} from '../../middleware/rate-limiter'

import { authController } from './auth.controller'

const authRouter = Router()

authRouter.post('/signup', authRateLimiter, authController.signup)
authRouter.post('/verify', authRateLimiter, authController.verifyOtp)
authRouter.post('/login', authRateLimiter, authController.login)
authRouter.post('/forgot-password/request', authRateLimiter, authController.requestPasswordReset)
authRouter.post('/forgot-password/verify', authRateLimiter, authController.verifyPasswordResetOtp)
authRouter.post('/forgot-password/reset', authRateLimiter, authController.resetPassword)
authRouter.post('/google', authRateLimiter, authController.google)
authRouter.post('/github', authRateLimiter, authController.github)
authRouter.post('/refresh', refreshRateLimiter, authController.refreshSession)
authRouter.post('/signout', authMiddleware, authController.signout)
authRouter.post('/signout/all', authMiddleware, authController.signoutAll)
authRouter.delete('/account', authMiddleware, authController.deleteAccount)

authRouter.get('/cli-token', authMiddleware, authController.getCliToken)
authRouter.post('/device/code', deviceCodeLimiter, authController.generateDeviceCode)
authRouter.post('/device/token', deviceCodeLimiter, authController.pollDeviceToken)
authRouter.post('/device/verify', authMiddleware, authController.verifyUserCode)

export default authRouter
