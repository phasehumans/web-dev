import { describe, it, expect, spyOn } from 'bun:test'

import { platformRepository } from '../../src/modules/platform/platform.repository'
import { platformService } from '../../src/modules/platform/platform.service'
import { vercelService } from '../../src/modules/platform/vercel.service'
import { AppError } from '../../src/shared/appError'
import * as projectStorage from '../../src/shared/project-storage'

describe('Platform Service - Unit Tests', () => {
    describe('downloadSession', () => {
        it('should throw AppError 404 if session not found', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            platformRepository.findSessionByIdAndUser = (async () => null) as any

            try {
                await expect(
                    platformService.downloadSession({
                        userId: 'u1',
                        sessionId: 'missing-session',
                    })
                ).rejects.toThrow(new AppError('Session not found', 404))
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
            }
        })

        it('should list files from storage and return built zip', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            const listSpy = spyOn(projectStorage, 'listPrefix').mockResolvedValue([
                { Key: 'sessions/s1/workspace/package.json' } as any,
                { Key: 'sessions/s1/workspace/src/App.tsx' } as any,
            ])
            const getTextSpy = spyOn(projectStorage, 'getTextFile').mockResolvedValue(
                'export default function App() {}'
            )

            platformRepository.findSessionByIdAndUser = (async () => ({
                id: 's1',
                title: 'My Cool App',
            })) as any

            try {
                const res = await platformService.downloadSession({
                    userId: 'u1',
                    sessionId: 's1',
                })

                expect(res.fileName).toBe('My-Cool-App.zip')
                expect(res.zip).toBeInstanceOf(Uint8Array)
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
                listSpy.mockRestore()
                getTextSpy.mockRestore()
            }
        })
    })

    describe('getUserGithubRepos', () => {
        it('should throw AppError 404 if user not found', async () => {
            const originalFind = platformRepository.findUserGithubConnection
            platformRepository.findUserGithubConnection = (async () => null) as any

            try {
                await expect(platformService.getUserGithubRepos({ userId: 'u1' })).rejects.toThrow(
                    new AppError('user not found', 404)
                )
            } finally {
                platformRepository.findUserGithubConnection = originalFind
            }
        })

        it('should throw AppError 401 if github is not connected', async () => {
            const originalFind = platformRepository.findUserGithubConnection
            platformRepository.findUserGithubConnection = (async () => ({
                githubConnected: false,
                githubToken: null,
            })) as any

            try {
                await expect(platformService.getUserGithubRepos({ userId: 'u1' })).rejects.toThrow(
                    new AppError('github is not connected', 401)
                )
            } finally {
                platformRepository.findUserGithubConnection = originalFind
            }
        })
    })

    describe('unlinkGithubRepo and unlinkVercelProject', () => {
        it('unlinkGithubRepo should unlink and return success message', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            const originalUnlink = platformRepository.unlinkSessionGithub

            platformRepository.findSessionByIdAndUser = (async () => ({ id: 's1' })) as any
            platformRepository.unlinkSessionGithub = async () => ({}) as any

            try {
                const res = await platformService.unlinkGithubRepo({
                    userId: 'u1',
                    sessionId: 's1',
                })
                expect(res.message).toBe('GitHub repository unlinked successfully')
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
                platformRepository.unlinkSessionGithub = originalUnlink
            }
        })

        it('unlinkVercelProject should unlink and return success message', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            const originalUnlink = platformRepository.unlinkSessionVercel

            platformRepository.findSessionByIdAndUser = (async () => ({ id: 's1' })) as any
            platformRepository.unlinkSessionVercel = async () => ({}) as any

            try {
                const res = await platformService.unlinkVercelProject({
                    userId: 'u1',
                    sessionId: 's1',
                })
                expect(res.message).toBe('Vercel project unlinked successfully')
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
                platformRepository.unlinkSessionVercel = originalUnlink
            }
        })
    })

    describe('syncEnvironmentVariables', () => {
        it('should throw AppError 400 if session is not linked to a Vercel project', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            platformRepository.findSessionByIdAndUser = (async () => ({
                id: 's1',
                vercelProjectId: null,
            })) as any

            try {
                await expect(
                    platformService.syncEnvironmentVariables({
                        userId: 'u1',
                        sessionId: 's1',
                    })
                ).rejects.toThrow(new AppError('Session is not linked to a Vercel project', 400))
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
            }
        })

        it('should sync filtered environment variables to Vercel', async () => {
            const originalFind = platformRepository.findSessionByIdAndUser
            const originalGetMemories = platformRepository.getSessionMemories
            const originalAddEnv = vercelService.addEnvVars

            platformRepository.findSessionByIdAndUser = (async () => ({
                id: 's1',
                vercelProjectId: 'prj_123',
            })) as any

            platformRepository.getSessionMemories = (async () => [
                { key: 'API_KEY', value: 'secret' },
                { key: 'PORT', value: '3000' },
            ]) as any

            let passedVars: any = null
            vercelService.addEnvVars = (async (data: any) => {
                passedVars = data.envVars
                return {} as any
            }) as any

            try {
                const res = await platformService.syncEnvironmentVariables({
                    userId: 'u1',
                    sessionId: 's1',
                    keys: ['API_KEY'],
                })

                expect(res.message).toBe('Environment variables synced successfully')
                expect(passedVars.length).toBe(1)
                expect(passedVars[0].key).toBe('API_KEY')
            } finally {
                platformRepository.findSessionByIdAndUser = originalFind
                platformRepository.getSessionMemories = originalGetMemories
                vercelService.addEnvVars = originalAddEnv
            }
        })
    })
})
