import axios from 'axios'
import { describe, it, expect } from 'bun:test'

import { platformRepository } from '../../src/modules/platform/platform.repository'
import { vercelService } from '../../src/modules/platform/vercel.service'
import { AppError } from '../../src/shared/appError'

describe('Platform Vercel Service - Unit Tests', () => {
    describe('createProject', () => {
        it('should throw AppError 400 if vercel account not connected', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: false,
                vercelAccessToken: null,
                vercelTeamId: null,
            })) as any

            try {
                await expect(
                    vercelService.createProject({
                        userId: 'u1',
                        name: 'my-project',
                    })
                ).rejects.toThrow(new AppError('vercel account not connected', 400))
            } finally {
                platformRepository.getVercelCredentials = originalCreds
            }
        })

        it('should create project on Vercel API and return id and name', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            const originalPost = axios.post

            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: true,
                vercelAccessToken: 'v-token-123',
                vercelTeamId: 'team_abc',
            })) as any

            let calledUrl = ''
            let calledPayload: any = null
            axios.post = (async (url: string, payload: any) => {
                calledUrl = url
                calledPayload = payload
                return {
                    data: {
                        id: 'prj_12345',
                        name: 'my-project',
                    },
                }
            }) as any

            try {
                const res = await vercelService.createProject({
                    userId: 'u1',
                    name: 'my-project',
                    repoOwner: 'phasehumans',
                    repoName: 'december',
                })

                expect(calledUrl).toContain('https://api.vercel.com/v9/projects')
                expect(calledUrl).toContain('teamId=team_abc')
                expect(calledPayload.name).toBe('my-project')
                expect(calledPayload.gitRepository.repo).toBe('phasehumans/december')
                expect(res.id).toBe('prj_12345')
            } finally {
                platformRepository.getVercelCredentials = originalCreds
                axios.post = originalPost
            }
        })
    })

    describe('getDeploymentStatus & cancelDeployment & addEnvVars & createDirectDeployment', () => {
        it('getDeploymentStatus should fetch status from Vercel API', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            const originalGet = axios.get

            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: true,
                vercelAccessToken: 'v-token',
                vercelTeamId: null,
            })) as any

            axios.get = (async () => ({
                data: {
                    id: 'dpl_123',
                    url: 'my-project.vercel.app',
                    readyState: 'READY',
                },
            })) as any

            try {
                const res = await vercelService.getDeploymentStatus({
                    userId: 'u1',
                    deploymentId: 'dpl_123',
                })
                expect(res.id).toBe('dpl_123')
                expect(res.readyState).toBe('READY')
            } finally {
                platformRepository.getVercelCredentials = originalCreds
                axios.get = originalGet
            }
        })

        it('cancelDeployment should call Vercel cancel endpoint', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            const originalPatch = axios.patch

            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: true,
                vercelAccessToken: 'v-token',
                vercelTeamId: null,
            })) as any

            axios.patch = (async () => ({
                data: { id: 'dpl_123', state: 'CANCELED' },
            })) as any

            try {
                const res = await vercelService.cancelDeployment({
                    userId: 'u1',
                    deploymentId: 'dpl_123',
                })
                expect(res.state).toBe('CANCELED')
            } finally {
                platformRepository.getVercelCredentials = originalCreds
                axios.patch = originalPatch
            }
        })

        it('addEnvVars should post environment variables to Vercel project', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            const originalPost = axios.post

            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: true,
                vercelAccessToken: 'v-token',
                vercelTeamId: null,
            })) as any

            let postedVars: any = null
            axios.post = (async (_url: string, data: any) => {
                postedVars = data
                return { data: { success: true } }
            }) as any

            try {
                const res = await vercelService.addEnvVars({
                    userId: 'u1',
                    vercelProjectId: 'prj_123',
                    envVars: [
                        {
                            key: 'DATABASE_URL',
                            value: 'postgres://...',
                            type: 'encrypted',
                            target: ['production'],
                        },
                    ],
                })
                expect(postedVars.length).toBe(1)
                expect(postedVars[0].key).toBe('DATABASE_URL')
                expect(res.success).toBe(true)
            } finally {
                platformRepository.getVercelCredentials = originalCreds
                axios.post = originalPost
            }
        })

        it('createDirectDeployment should deploy files to Vercel', async () => {
            const originalCreds = platformRepository.getVercelCredentials
            const originalPost = axios.post

            platformRepository.getVercelCredentials = (async () => ({
                vercelConnected: true,
                vercelAccessToken: 'v-token',
                vercelTeamId: null,
            })) as any

            axios.post = (async () => ({
                data: {
                    id: 'dpl_direct_123',
                    url: 'direct-deploy.vercel.app',
                    readyState: 'INITIALIZING',
                },
            })) as any

            try {
                const res = await vercelService.createDirectDeployment({
                    userId: 'u1',
                    vercelProjectId: 'prj_123',
                    name: 'my-direct-project',
                    files: [{ file: 'package.json', data: '{}' }],
                })
                expect(res.id).toBe('dpl_direct_123')
                expect(res.url).toBe('direct-deploy.vercel.app')
            } finally {
                platformRepository.getVercelCredentials = originalCreds
                axios.post = originalPost
            }
        })
    })
})
