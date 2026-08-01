import { Router } from 'express'

import { authMiddleware } from '../../middleware/auth.middleware'

import * as sessionController from './session.controller'

const sessionRouter = Router()

sessionRouter.use(authMiddleware)

sessionRouter.get('/', sessionController.getSessions)
sessionRouter.post('/', sessionController.createSession)
sessionRouter.get('/:id', sessionController.getSessionById)
sessionRouter.patch('/:id/rename', sessionController.renameSession)
sessionRouter.patch('/:id/archive', sessionController.archiveSession)
sessionRouter.patch('/:id/unarchive', sessionController.unarchiveSession)
sessionRouter.put('/:id/tags', sessionController.updateSessionTags)
sessionRouter.get('/:id/insights', sessionController.getSessionInsights)
sessionRouter.delete('/:id', sessionController.deleteSession)
sessionRouter.get('/:id/collaborators', sessionController.getCollaborators)
sessionRouter.post('/:id/collaborators', sessionController.addCollaborator)
sessionRouter.delete('/:id/collaborators/:email', sessionController.removeCollaborator)
sessionRouter.get('/:id/rehydrate', sessionController.rehydrateSession)
sessionRouter.post('/:id/disconnect', sessionController.disconnectSession)
sessionRouter.all('/:id/preview/:port', sessionController.proxyPreview)

export default sessionRouter
