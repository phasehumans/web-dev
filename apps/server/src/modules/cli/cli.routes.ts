import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import { cliController } from './cli.controller'

const cliRouter = Router()

cliRouter.use(authMiddleware)
cliRouter.post('/chat/completions', cliController.chatCompletions)
cliRouter.get('/handoff/upload-url', cliController.getHandoffUploadUrl)
cliRouter.post('/handoff/complete', cliController.completeHandoff)

export default cliRouter
