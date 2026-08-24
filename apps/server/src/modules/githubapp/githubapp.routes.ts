import express, { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import { githubAppController } from './githubapp.controller'

const githubAppRouter = Router()

githubAppRouter.get('/install-start', authMiddleware, githubAppController.startInstall)
githubAppRouter.get('/install', authMiddleware, githubAppController.startInstall)
githubAppRouter.get('/callback', githubAppController.handleCallback)
githubAppRouter.get('/repos', authMiddleware, githubAppController.getRepos)
githubAppRouter.get('/status', authMiddleware, githubAppController.getStatus)
githubAppRouter.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    githubAppController.handleWebhook
)

export default githubAppRouter
