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

            githubAppRepository.upsertInstallation = (async (data: any) => {
                calledWith = data
                return { id: 'inst-1', ...data } as any
            }) as any

            try {
                const res = await githubAppService.processInstallation({
                    installationId: 'install-100',
                    userId: 'user-1',
                    accountLogin: 'test-user',
                    accountType: 'User',
                    targetType: 'selected',
                })
                expect(calledWith).toEqual({
                    installationId: 'install-100',
                    userId: 'user-1',
                    accountLogin: 'test-user',
                    accountType: 'User',
                    targetType: 'selected',
                    permissions: undefined,
                })
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

            githubAppRepository.deleteInstallation = (async (installationId: string) => {
                calledWith = { installationId }
                return { id: 'inst-1', installationId } as any
            }) as any

            try {
                const res = await githubAppService.processUninstallation({
                    installationId: 'install-100',
                })
                expect(calledWith).toEqual({ installationId: 'install-100' })
                expect(res?.installationId).toBe('install-100')
            } finally {
                githubAppRepository.deleteInstallation = originalDelete
            }
        })
    })

    describe('getUserInstallationStatus', () => {
        it('should return installed: false when no installation exists', async () => {
            const originalFindByUserId = githubAppRepository.findByUserId
            githubAppRepository.findByUserId = (async () => null) as any

            try {
                const status = await githubAppService.getUserInstallationStatus({
                    userId: 'user-404',
                })
                expect(status).toEqual({
                    installed: false,
                    installationId: null,
                    accountLogin: null,
                    accountType: null,
                    targetType: null,
                })
            } finally {
                githubAppRepository.findByUserId = originalFindByUserId
            }
        })

        it('should return installed: true and metadata when installation exists', async () => {
            const originalFindByUserId = githubAppRepository.findByUserId
            githubAppRepository.findByUserId = (async () => ({
                id: 'inst-row-1',
                installationId: '123456',
                userId: 'user-1',
                accountLogin: 'octocat',
                accountType: 'User',
                targetType: 'selected',
                permissions: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            })) as any

            try {
                const status = await githubAppService.getUserInstallationStatus({
                    userId: 'user-1',
                })
                expect(status).toEqual({
                    installed: true,
                    installationId: '123456',
                    accountLogin: 'octocat',
                    accountType: 'User',
                    targetType: 'selected',
                })
            } finally {
                githubAppRepository.findByUserId = originalFindByUserId
            }
        })
    })

    describe('getUserInstallationToken', () => {
        it('should throw AppError 400 when installation does not exist', async () => {
            const originalFindByUserId = githubAppRepository.findByUserId
            githubAppRepository.findByUserId = (async () => null) as any

            try {
                await expect(
                    githubAppService.getUserInstallationToken({ userId: 'user-none' })
                ).rejects.toThrow('GitHub App is not installed for this account')
            } finally {
                githubAppRepository.findByUserId = originalFindByUserId
            }
        })

        it('should look up installation by owner if owner is provided', async () => {
            const originalFindByOwnerAndUser = githubAppRepository.findByOwnerAndUser
            const originalFetch = globalThis.fetch

            let searchedOwner: string | null = null
            githubAppRepository.findByOwnerAndUser = (async (owner: string) => {
                searchedOwner = owner
                return {
                    id: 'inst-org-1',
                    installationId: '999111',
                    userId: 'user-1',
                    accountLogin: 'my-org',
                    accountType: 'Organization',
                    targetType: 'selected',
                    permissions: {},
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any
            }) as any

            globalThis.fetch = (async (url: string) => {
                if (url.includes('/access_tokens')) {
                    return {
                        ok: true,
                        json: async () => ({
                            token: 'ghs_mocked_token',
                            expires_at: '2026-08-25T12:00:00Z',
                        }),
                    }
                }
                return { ok: false, text: async () => 'Not found' }
            }) as any

            try {
                const token = await githubAppService.getUserInstallationToken({
                    userId: 'user-1',
                    owner: 'my-org',
                })
                expect(searchedOwner).toBe('my-org')
                expect(token).toBe('ghs_mocked_token')
            } finally {
                githubAppRepository.findByOwnerAndUser = originalFindByOwnerAndUser
                globalThis.fetch = originalFetch
            }
        })
    })

    describe('getUserInstallationRepos', () => {
        it('should aggregate repositories across multiple installations', async () => {
            const originalFindAll = githubAppRepository.findAllByUserId
            const originalFetch = globalThis.fetch

            githubAppRepository.findAllByUserId = (async () => [
                { installationId: 'inst-1', userId: 'user-1' },
                { installationId: 'inst-2', userId: 'user-1' },
            ]) as any

            let repoFetchCount = 0
            globalThis.fetch = (async (url: string) => {
                if (url.includes('/access_tokens')) {
                    return {
                        ok: true,
                        json: async () => ({
                            token: 'ghs_token',
                            expires_at: '2026-08-25T12:00:00Z',
                        }),
                    }
                }

                if (url.includes('/installation/repositories')) {
                    repoFetchCount++
                    return {
                        ok: true,
                        json: async () => ({
                            repositories: [
                                {
                                    id: repoFetchCount === 1 ? 101 : 102,
                                    name: repoFetchCount === 1 ? 'personal-private' : 'org-private',
                                    full_name:
                                        repoFetchCount === 1
                                            ? 'user/personal-private'
                                            : 'org/org-private',
                                    private: true,
                                    default_branch: 'main',
                                    updated_at: '2026-08-25T00:00:00Z',
                                    html_url: 'https://github.com/...',
                                    clone_url: 'https://github.com/...',
                                    owner: { login: repoFetchCount === 1 ? 'user' : 'org' },
                                },
                            ],
                        }),
                    }
                }

                return { ok: false, text: async () => 'Not found' }
            }) as any

            try {
                const repos = await githubAppService.getUserInstallationRepos({
                    userId: 'user-1',
                })
                expect(repos.length).toBe(2)
                expect(repos[0].name).toBe('personal-private')
                expect(repos[0].private).toBe(true)
                expect(repos[1].name).toBe('org-private')
                expect(repos[1].private).toBe(true)
            } finally {
                githubAppRepository.findAllByUserId = originalFindAll
                globalThis.fetch = originalFetch
            }
        })
    })
})
