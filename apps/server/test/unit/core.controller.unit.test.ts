import { describe, it, expect, spyOn } from 'bun:test'

import { coreController } from '../../src/modules/core/core.controller'
import { coreService } from '../../src/modules/core/core.service'

describe('Core Controller - Unit Tests', () => {
    describe('handlePrompt', () => {
        it('should throw 401 AppError if req.user or req.user.userId is missing', async () => {
            const reqMissingUser: any = { body: { prompt: 'Hello' } }
            const reqMissingUserId: any = { user: {}, body: { prompt: 'Hello' } }
            const res: any = {}
            let caughtError: any = null
            const next: any = (err: any) => {
                caughtError = err
            }

            await coreController.handlePrompt(reqMissingUser, res, next)
            expect(caughtError).not.toBeNull()
            expect(caughtError.statusCode).toBe(401)
            expect(caughtError.message).toBe('unauthorized')

            caughtError = null
            await coreController.handlePrompt(reqMissingUserId, res, next)
            expect(caughtError).not.toBeNull()
            expect(caughtError.statusCode).toBe(401)
            expect(caughtError.message).toBe('unauthorized')
        })

        it('should validate request body and call coreService.processPromptJob with parsed params', async () => {
            let capturedData: any = null
            const spyService = spyOn(coreService, 'processPromptJob').mockImplementation((async (
                data: any
            ) => {
                capturedData = data
                return { jobId: 'job-999', sessionId: 'sess-789' }
            }) as any)

            try {
                const req: any = {
                    user: { userId: 'usr-123' },
                    body: {
                        prompt: 'Refactor auth module',
                        projectId: 'prj-456',
                        sessionId: 'sess-789',
                    },
                }

                let responseData: any = null
                const res: any = {
                    status: (code: number) => {
                        expect(code).toBe(200)
                        return res
                    },
                    json: (payload: any) => {
                        responseData = payload
                        return res
                    },
                }
                const next: any = () => {}

                await coreController.handlePrompt(req, res, next)

                expect(capturedData).toEqual({
                    userId: 'usr-123',
                    prompt: 'Refactor auth module',
                    projectId: 'prj-456',
                    sessionId: 'sess-789',
                })
                expect(responseData).not.toBeNull()
                expect(responseData.success).toBe(true)
                expect(responseData.message).toBe('job enqueued')
                expect(responseData.data).toEqual({ jobId: 'job-999', sessionId: 'sess-789' })
            } finally {
                spyService.mockRestore()
            }
        })
    })
})
