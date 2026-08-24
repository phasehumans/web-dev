import { describe, it, expect } from 'bun:test'

import { importRepository } from '../../src/modules/platform/import/import.repository'
import { uploadService } from '../../src/modules/platform/import/import.service'
import { AppError } from '../../src/shared/appError'

describe('Import Service - Unit Tests', () => {
    describe('importFromGithub', () => {
        it('should throw AppError 400 if repository URL is invalid', async () => {
            await expect(
                uploadService.importFromGithub({
                    userId: 'u1',
                    repoURL: 'invalid-url',
                })
            ).rejects.toThrow(new AppError('Invalid URL format', 400))
        })

        it('should throw AppError 404 if user not found', async () => {
            const originalFind = importRepository.findUserForImport
            importRepository.findUserForImport = (async () => null) as any

            try {
                await expect(
                    uploadService.importFromGithub({
                        userId: 'u1',
                        repoURL: 'https://github.com/facebook/react',
                    })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                importRepository.findUserForImport = originalFind
            }
        })

        it('should allow public repository import or proceed when user has no token', async () => {
            const originalFind = importRepository.findUserForImport
            const originalCreateSession = importRepository.createPlaceholderSession
            const originalCreateImport = importRepository.createImport

            importRepository.findUserForImport = (async () => ({
                id: 'u1',
                githubToken: null,
            })) as any

            importRepository.createPlaceholderSession = (async () => ({}) as any) as any
            importRepository.createImport = (async (data: any) => ({
                id: 'import-public',
                status: 'PENDING',
                sourceType: 'GITHUB',
                sourceUrl: data.sourceUrl,
                sessionId: data.sessionId,
            })) as any

            try {
                const res = await uploadService.importFromGithub({
                    userId: 'u1',
                    repoURL: 'https://github.com/facebook/react',
                })
                expect(res.id).toBe('import-public')
            } finally {
                importRepository.findUserForImport = originalFind
                importRepository.createPlaceholderSession = originalCreateSession
                importRepository.createImport = originalCreateImport
            }
        })

        it('should create placeholder session and import record on valid input', async () => {
            const originalFind = importRepository.findUserForImport
            const originalCreateSession = importRepository.createPlaceholderSession
            const originalCreateImport = importRepository.createImport
            const originalIncrement = importRepository.incrementAttempts
            const originalUpdate = importRepository.updateImport

            importRepository.findUserForImport = (async () => ({
                id: 'u1',
                githubToken: 'gho_token123',
            })) as any

            let createdSessionPayload: any = null
            importRepository.createPlaceholderSession = (async (data: any) => {
                createdSessionPayload = data
                return {} as any
            }) as any

            let createdImportPayload: any = null
            importRepository.createImport = (async (data: any) => {
                createdImportPayload = data
                return {
                    id: 'import-123',
                    status: 'PENDING',
                    sourceType: 'GITHUB',
                    sourceUrl: data.sourceUrl,
                    sessionId: data.sessionId,
                } as any
            }) as any

            importRepository.incrementAttempts = (async () => ({}) as any) as any
            importRepository.updateImport = (async () => ({}) as any) as any

            try {
                const res = await uploadService.importFromGithub({
                    userId: 'u1',
                    repoURL: 'https://github.com/phasehumans/december',
                })

                expect(res.id).toBe('import-123')
                expect(createdSessionPayload.displayName).toBe('december')
                expect(createdImportPayload.sourceUrl).toBe(
                    'https://github.com/phasehumans/december'
                )
            } finally {
                importRepository.findUserForImport = originalFind
                importRepository.createPlaceholderSession = originalCreateSession
                importRepository.createImport = originalCreateImport
                importRepository.incrementAttempts = originalIncrement
                importRepository.updateImport = originalUpdate
            }
        })
    })

    describe('getImportStatus', () => {
        it('should throw error if import record not found', async () => {
            const originalFind = importRepository.findImportForStatus
            importRepository.findImportForStatus = (async () => null) as any

            try {
                await expect(
                    uploadService.getImportStatus({
                        userId: 'u1',
                        importId: 'missing-id',
                    })
                ).rejects.toThrow('import not found')
            } finally {
                importRepository.findImportForStatus = originalFind
            }
        })

        it('should return import record status when found', async () => {
            const originalFind = importRepository.findImportForStatus
            importRepository.findImportForStatus = (async () => ({
                id: 'imp-1',
                status: 'READY',
                sessionId: null,
            })) as any

            try {
                const res = await uploadService.getImportStatus({
                    userId: 'u1',
                    importId: 'imp-1',
                })

                expect(res.id).toBe('imp-1')
                expect(res.status).toBe('READY')
            } finally {
                importRepository.findImportForStatus = originalFind
            }
        })
    })
})
