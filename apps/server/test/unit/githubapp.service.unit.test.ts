import crypto from 'crypto'

import { describe, it, expect } from 'bun:test'

import { env } from '../../src/env'
import { githubAppRepository } from '../../src/modules/githubapp/githubapp.repository'
import { githubAppService } from '../../src/modules/githubapp/githubapp.service'

describe('GitHubApp Service - Unit Tests', () => {
    describe('verifySignature', () => {
        const payload = JSON.stringify({ action: 'created', installation: { id: 12345 } })
        const secret = env.GITHUB_APP_WEBHOOK_SECRET || 'secret'

        it('should return true for valid HMAC SHA-256 signature', () => {
            const hmac = crypto.createHmac('sha256', secret)
            hmac.update(payload)
            const signature = `sha256=${hmac.digest('hex')}`

            const result = githubAppService.verifySignature({ payload, signature })
            expect(result).toBe(true)
        })

        it('should return false for invalid signature value or signature length mismatch', () => {
            const invalidSignature = 'sha256=invalidhashvalue12345'
            const result1 = githubAppService.verifySignature({
                payload,
                signature: invalidSignature,
            })
            expect(result1).toBe(false)

            const wrongLengthSig = 'sha256=123'
            const result2 = githubAppService.verifySignature({
                payload,
                signature: wrongLengthSig,
            })
            expect(result2).toBe(false)
        })
    })

    describe('processInstallation', () => {
        it('should call githubAppRepository.upsertInstallation', async () => {
            const originalUpsert = githubAppRepository.upsertInstallation
            let calledWith: any = null

            githubAppRepository.upsertInstallation = (async (installationId, userId) => {
                calledWith = { installationId, userId }
                return { id: 'inst-1', installationId, userId } as any
            }) as any

            try {
                const res = await githubAppService.processInstallation({
                    installationId: 'install-100',
                    userId: 'user-1',
                })
                expect(calledWith).toEqual({ installationId: 'install-100', userId: 'user-1' })
                expect(res.installationId).toBe('install-100')
            } finally {
                githubAppRepository.upsertInstallation = originalUpsert
            }
        })
    })

    describe('processUninstallation', () => {
        it('should call githubAppRepository.deleteInstallation', async () => {
            const originalDelete = githubAppRepository.deleteInstallation
            let calledWith: any = null

            githubAppRepository.deleteInstallation = (async (installationId) => {
                calledWith = { installationId }
                return { id: 'inst-1', installationId } as any
            }) as any

            try {
                const res = await githubAppService.processUninstallation({
                    installationId: 'install-100',
                })
                expect(calledWith).toEqual({ installationId: 'install-100' })
                expect(res.installationId).toBe('install-100')
            } finally {
                githubAppRepository.deleteInstallation = originalDelete
            }
        })
    })
})
