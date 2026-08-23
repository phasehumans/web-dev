import { describe, it, expect } from 'bun:test'

import { runtimeRepository } from '../../src/modules/runtime/runtime.repository'
import { runtimeService } from '../../src/modules/runtime/runtime.service'
import { AppError } from '../../src/shared/appError'

describe('Runtime Service - Unit Tests', () => {
    describe('startPreview', () => {
        it('should throw AppError 404 if session not found', async () => {
            const originalFind = runtimeRepository.findSessionForStart
            runtimeRepository.findSessionForStart = (async () => null) as any

            try {
                await expect(
                    runtimeService.startPreview({
                        userId: 'u1',
                        projectId: '123e4567-e89b-12d3-a456-426614174000',
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                runtimeRepository.findSessionForStart = originalFind
            }
        })

        it('should return healthy preview status when session exists', async () => {
            const originalFind = runtimeRepository.findSessionForStart
            const sessionId = '123e4567-e89b-12d3-a456-426614174000'

            runtimeRepository.findSessionForStart = (async () => ({
                id: sessionId,
                vmStatus: 'RUNNING',
                updatedAt: new Date(),
            })) as any

            try {
                const res = await runtimeService.startPreview({
                    userId: 'u1',
                    projectId: sessionId,
                })

                expect(res.previewId).toBe(sessionId)
                expect(res.state).toBe('Healthy')
                expect(res.backendStatus).toBe('ready')
            } finally {
                runtimeRepository.findSessionForStart = originalFind
            }
        })
    })

    describe('getPreviewStatus', () => {
        it('should throw AppError 404 if session not found', async () => {
            const originalFind = runtimeRepository.findSessionForStatus
            runtimeRepository.findSessionForStatus = (async () => null) as any

            try {
                await expect(
                    runtimeService.getPreviewStatus({
                        userId: 'u1',
                        previewId: 'missing-preview',
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                runtimeRepository.findSessionForStatus = originalFind
            }
        })

        it('should return preview status from DB fallback when not cached', async () => {
            const originalFind = runtimeRepository.findSessionForStatus
            const previewId = 'session-preview-1'

            runtimeRepository.findSessionForStatus = (async () => ({
                id: previewId,
                vmStatus: 'RUNNING',
                updatedAt: new Date(),
            })) as any

            try {
                const res = await runtimeService.getPreviewStatus({
                    userId: 'u1',
                    previewId,
                })

                expect(res.previewId).toBe(previewId)
                expect(res.state).toBe('Healthy')
                expect(res.backendStatus).toBe('ready')
            } finally {
                runtimeRepository.findSessionForStatus = originalFind
            }
        })
    })

    describe('deletePreview', () => {
        it('should throw AppError 404 if session not found to delete', async () => {
            const originalFind = runtimeRepository.findSessionForDelete
            runtimeRepository.findSessionForDelete = (async () => null) as any

            try {
                await expect(
                    runtimeService.deletePreview({
                        userId: 'u1',
                        previewId: 'missing-preview',
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                runtimeRepository.findSessionForDelete = originalFind
            }
        })

        it('should delete preview status and return { deleted: true }', async () => {
            const originalFind = runtimeRepository.findSessionForDelete
            runtimeRepository.findSessionForDelete = (async () => ({
                id: 'preview-1',
            })) as any

            try {
                const res = await runtimeService.deletePreview({
                    userId: 'u1',
                    previewId: 'preview-1',
                })
                expect(res).toEqual({ deleted: true })
            } finally {
                runtimeRepository.findSessionForDelete = originalFind
            }
        })
    })

    describe('recordRuntimeStatus & notifyManifestPublished & checkSandboxCompilation', () => {
        it('recordRuntimeStatus should store and return status', () => {
            const mockStatus: any = {
                previewId: 'p-1',
                sessionId: 's-1',
                state: 'Healthy',
                backendStatus: 'ready',
                updatedAt: new Date().toISOString(),
            }
            const res = runtimeService.recordRuntimeStatus({
                previewId: 'p-1',
                status: mockStatus,
            })
            expect(res).toEqual(mockStatus)
        })

        it('notifyManifestPublished should set and return healthy preview status', async () => {
            const res = await runtimeService.notifyManifestPublished({
                sessionId: 's-1',
                manifest: {} as any,
            })
            expect(res.previewId).toBe('s-1')
            expect(res.state).toBe('Healthy')
        })

        it('checkSandboxCompilation should return success: true', async () => {
            const res = await runtimeService.checkSandboxCompilation({ sessionId: 's-1' })
            expect(res.success).toBe(true)
        })
    })
})
