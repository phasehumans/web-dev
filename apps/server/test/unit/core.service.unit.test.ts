import * as DecemberShared from '@december/shared'
import { describe, it, expect, spyOn } from 'bun:test'

import { coreRepository } from '../../src/modules/core/core.repository'
import { coreService } from '../../src/modules/core/core.service'

describe('Core Service - Extensive Unit Tests', () => {
    describe('processPromptJob', () => {
        it('should create a new session and enqueue job with complete payload when sessionId is omitted', async () => {
            const originalCreateSession = coreRepository.createSessionWithPrompt

            let createdSessionArgs: any = null
            let enqueuedJobArgs: any = null

            coreRepository.createSessionWithPrompt = (async (data: any) => {
                createdSessionArgs = data
                return {
                    id: 'new-session-id',
                    userId: data.userId,
                    title: data.prompt.slice(0, 50),
                    projectId: data.projectId,
                    type: 'WEB',
                } as any
            }) as any

            const enqueueSpy = spyOn(DecemberShared, 'enqueueJob').mockImplementation((async (
                jobName: string,
                payload: any
            ) => {
                enqueuedJobArgs = { jobName, payload }
                return { id: 'job-101' } as any
            }) as any)

            try {
                const result = await coreService.processPromptJob({
                    userId: 'user-1',
                    prompt: 'Build a dashboard',
                    projectId: 'proj-999',
                })

                expect(result.jobId).toBe('job-101')
                expect(result.sessionId).toBe('new-session-id')
                expect(createdSessionArgs).toEqual({
                    userId: 'user-1',
                    prompt: 'Build a dashboard',
                    projectId: 'proj-999',
                })
                expect(enqueuedJobArgs.jobName).toBe('prompt_job')
                expect(enqueuedJobArgs.payload).toEqual({
                    prompt: 'Build a dashboard',
                    projectId: 'proj-999',
                    sessionId: 'new-session-id',
                    userId: 'user-1',
                })
            } finally {
                coreRepository.createSessionWithPrompt = originalCreateSession
                enqueueSpy.mockRestore()
            }
        })

        it('should use existing session and enqueue job when valid sessionId is provided', async () => {
            const originalFindSession = coreRepository.findSessionById

            let findSessionArgs: any = null
            let enqueuedJobArgs: any = null

            coreRepository.findSessionById = (async (data: any) => {
                findSessionArgs = data
                return {
                    id: 'existing-session-id',
                    userId: 'user-1',
                } as any
            }) as any

            const enqueueSpy = spyOn(DecemberShared, 'enqueueJob').mockImplementation((async (
                jobName: string,
                payload: any
            ) => {
                enqueuedJobArgs = { jobName, payload }
                return { id: 'job-102' } as any
            }) as any)

            try {
                const result = await coreService.processPromptJob({
                    userId: 'user-1',
                    prompt: 'Update styling',
                    sessionId: 'existing-session-id',
                })

                expect(result.jobId).toBe('job-102')
                expect(result.sessionId).toBe('existing-session-id')
                expect(findSessionArgs).toEqual({
                    sessionId: 'existing-session-id',
                    userId: 'user-1',
                })
                expect(enqueuedJobArgs.jobName).toBe('prompt_job')
                expect(enqueuedJobArgs.payload.sessionId).toBe('existing-session-id')
            } finally {
                coreRepository.findSessionById = originalFindSession
                enqueueSpy.mockRestore()
            }
        })

        it('should throw 404 AppError if provided sessionId is not found', async () => {
            const originalFindSession = coreRepository.findSessionById
            coreRepository.findSessionById = (async () => null) as any

            try {
                await coreService.processPromptJob({
                    userId: 'user-1',
                    prompt: 'Update styling',
                    sessionId: 'nonexistent-session-id',
                })
                expect(true).toBe(false)
            } catch (err: any) {
                expect(err.statusCode).toBe(404)
                expect(err.message).toBe('Session not found')
            } finally {
                coreRepository.findSessionById = originalFindSession
            }
        })
    })
})
