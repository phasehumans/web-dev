import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import { canvasController } from './canvas.controller'

const canvasRouter = Router()

canvasRouter.use(authMiddleware)
canvasRouter.post('/web-clips', canvasController.createWebClips)
canvasRouter.post('/save', canvasController.saveCanvas)
canvasRouter.post('/waitlist', canvasController.joinWaitlist)

export default canvasRouter
