import axios from 'axios'
import { describe, it, expect } from 'bun:test'

import { integrationRepository } from '../../src/modules/integration/integration.repository'
import { integrationsService } from '../../src/modules/integration/integration.service'
import { notificationService } from '../../src/modules/notification/notification.service'
import { AppError } from '../../src/shared/appError'

describe('Integration Service - Unit Tests', () => {
    describe('connectVercel', () => {
        it('should throw AppError 404 if user not found or isDeleted', async () => {
            const originalFind = integrationRepository.findUserFirst
            integrationRepository.findUserFirst = (async () => null) as any

            try {
                await expect(
                    integrationsService.connectVercel({
                        userId: 'u1',
                        code: 'test-code',
                    })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                integrationRepository.findUserFirst = originalFind
            }
        })

        it('should exchange code with Vercel API and update user tokens', async () => {
            const originalFind = integrationRepository.findUserFirst
            const originalUpdate = integrationRepository.updateUserVercel
            const originalSendNotif = notificationService.sendNotificationToUser
            const originalFetch = globalThis.fetch

            integrationRepository.findUserFirst = (async () => ({
                id: 'u1',
                isDeleted: false,
            })) as any
            let updatedUserPayload: any = null
            integrationRepository.updateUserVercel = (async (data) => {
                updatedUserPayload = data
                return { id: data.id, vercelConnected: true } as any
            }) as any
            notificationService.sendNotificationToUser = async () => ({}) as any

            globalThis.fetch = (async (url: string) => {
                if (url.includes('api.vercel.com/v2/oauth/access_token')) {
                    return {
                        ok: true,
                        text: async () =>
                            JSON.stringify({ access_token: 'vercel-access-token-123' }),
                    } as any
                }
                return { ok: false, text: async () => 'error' } as any
            }) as any

            try {
                const res = await integrationsService.connectVercel({
                    userId: 'u1',
                    code: 'vercel-code',
                    teamId: 'team-1',
                    configurationId: 'config-1',
                })

                expect(updatedUserPayload).toEqual({
                    id: 'u1',
                    vercelAccessToken: 'vercel-access-token-123',
                    vercelTeamId: 'team-1',
                    vercelConfigurationId: 'config-1',
                })
                expect((res as any).vercelConnected).toBe(true)
            } finally {
                integrationRepository.findUserFirst = originalFind
                integrationRepository.updateUserVercel = originalUpdate
                notificationService.sendNotificationToUser = originalSendNotif
                globalThis.fetch = originalFetch
            }
        })
    })

    describe('connectSupabase', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFind = integrationRepository.findUserFirst
            integrationRepository.findUserFirst = (async () => null) as any

            try {
                await expect(
                    integrationsService.connectSupabase({
                        userId: 'u1',
                        code: 'code',
                    })
                ).rejects.toThrow(new AppError('user not found', 404))
            } finally {
                integrationRepository.findUserFirst = originalFind
            }
        })

        it('should exchange code via Supabase OAuth and update tokens', async () => {
            const originalFind = integrationRepository.findUserFirst
            const originalUpdate = integrationRepository.updateUserSupabase
            const originalSendNotif = notificationService.sendNotificationToUser
            const originalPost = axios.post

            integrationRepository.findUserFirst = (async () => ({
                id: 'u1',
                isDeleted: false,
            })) as any
            let updatePayload: any = null
            integrationRepository.updateUserSupabase = (async (data) => {
                updatePayload = data
                return { id: data.id, supabaseConnected: true } as any
            }) as any
            notificationService.sendNotificationToUser = async () => ({}) as any

            axios.post = (async (url: string) => {
                if (url.includes('api.supabase.com/v1/oauth/token')) {
                    return {
                        data: {
                            access_token: 'sb-access-token',
                            refresh_token: 'sb-refresh-token',
                            expires_in: 3600,
                            scope: 'all',
                        },
                    }
                }
                return { data: {} }
            }) as any

            try {
                const res = await integrationsService.connectSupabase({
                    userId: 'u1',
                    code: 'sb-code',
                })

                expect(updatePayload.id).toBe('u1')
                expect(updatePayload.supabaseAccessToken).toBe('sb-access-token')
                expect(updatePayload.supabaseRefreshToken).toBe('sb-refresh-token')
                expect(updatePayload.supabaseTokenScope).toBe('all')
                expect((res as any).supabaseConnected).toBe(true)
            } finally {
                integrationRepository.findUserFirst = originalFind
                integrationRepository.updateUserSupabase = originalUpdate
                notificationService.sendNotificationToUser = originalSendNotif
                axios.post = originalPost
            }
        })
    })

    describe('connectNotion', () => {
        it('should exchange code via Notion OAuth and save workspace data', async () => {
            const originalFind = integrationRepository.findUserFirst
            const originalUpdate = integrationRepository.updateUserNotion
            const originalSendNotif = notificationService.sendNotificationToUser
            const originalPost = axios.post

            integrationRepository.findUserFirst = (async () => ({
                id: 'u1',
                isDeleted: false,
            })) as any
            let updatePayload: any = null
            integrationRepository.updateUserNotion = (async (data) => {
                updatePayload = data
                return { id: data.id, notionWorkspaceName: data.notionWorkspaceName } as any
            }) as any
            notificationService.sendNotificationToUser = async () => ({}) as any

            axios.post = (async (url: string) => {
                if (url.includes('api.notion.com/v1/oauth/token')) {
                    return {
                        data: {
                            access_token: 'notion-access-token',
                            workspace_id: 'ws-123',
                            workspace_name: 'Acme Notion Workspace',
                        },
                    }
                }
                return { data: {} }
            }) as any

            try {
                const res = await integrationsService.connectNotion({
                    userId: 'u1',
                    code: 'notion-code',
                })

                expect(updatePayload.notionAccessToken).toBe('notion-access-token')
                expect(updatePayload.notionWorkspaceId).toBe('ws-123')
                expect(updatePayload.notionWorkspaceName).toBe('Acme Notion Workspace')
                expect((res as any).notionWorkspaceName).toBe('Acme Notion Workspace')
            } finally {
                integrationRepository.findUserFirst = originalFind
                integrationRepository.updateUserNotion = originalUpdate
                notificationService.sendNotificationToUser = originalSendNotif
                axios.post = originalPost
            }
        })
    })

    describe('connectGithub and handleGitHubOAuth', () => {
        it('should update user github connection details', async () => {
            const originalFind = integrationRepository.findUserFirst
            const originalUpdate = integrationRepository.updateUserGithub
            const originalSendNotif = notificationService.sendNotificationToUser

            integrationRepository.findUserFirst = (async () => ({
                id: 'u1',
                isDeleted: false,
            })) as any
            let updatePayload: any = null
            integrationRepository.updateUserGithub = (async (data) => {
                updatePayload = data
                return { id: data.id, githubConnected: true, githubUsername: data.username } as any
            }) as any
            notificationService.sendNotificationToUser = async () => ({}) as any

            try {
                const res = await integrationsService.connectGithub({
                    userId: 'u1',
                    accessToken: 'gho_token123',
                    username: 'octocat',
                })

                expect(updatePayload).toEqual({
                    id: 'u1',
                    username: 'octocat',
                    accessToken: 'gho_token123',
                })
                expect((res as any).githubConnected).toBe(true)
            } finally {
                integrationRepository.findUserFirst = originalFind
                integrationRepository.updateUserGithub = originalUpdate
                notificationService.sendNotificationToUser = originalSendNotif
            }
        })

        it('handleGitHubOAuth should fetch token and user profile, then connect github', async () => {
            const originalFind = integrationRepository.findUserFirst
            const originalUpdate = integrationRepository.updateUserGithub
            const originalSendNotif = notificationService.sendNotificationToUser
            const originalFetch = globalThis.fetch

            let updateCalledWith: any = null
            integrationRepository.findUserFirst = (async () => ({
                id: 'u1',
                isDeleted: false,
            })) as any
            integrationRepository.updateUserGithub = (async (data) => {
                updateCalledWith = data
                return { id: data.id, githubConnected: true } as any
            }) as any
            notificationService.sendNotificationToUser = async () => ({}) as any

            globalThis.fetch = (async (url: string) => {
                if (url.includes('github.com/login/oauth/access_token')) {
                    return {
                        json: async () => ({ access_token: 'gho_secret_token' }),
                    } as any
                }
                if (url.includes('api.github.com/user')) {
                    return {
                        json: async () => ({ login: 'octocat_oauth' }),
                    } as any
                }
                return { json: async () => ({}) } as any
            }) as any

            try {
                const res = await integrationsService.handleGitHubOAuth({
                    code: 'oauth-code',
                    userId: 'u1',
                })

                expect(updateCalledWith).toEqual({
                    id: 'u1',
                    accessToken: 'gho_secret_token',
                    username: 'octocat_oauth',
                })
                expect((res as any).githubConnected).toBe(true)
            } finally {
                integrationRepository.findUserFirst = originalFind
                integrationRepository.updateUserGithub = originalUpdate
                notificationService.sendNotificationToUser = originalSendNotif
                globalThis.fetch = originalFetch
            }
        })
    })
})
