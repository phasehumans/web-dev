import fs from 'node:fs/promises'
import path from 'node:path'

import { expect, test, describe, beforeEach, afterEach, spyOn, mock } from 'bun:test'

import { loadConfig, saveConfig, getProviderConfig, getAuthStatus } from '../src/config'

describe('config', () => {
    let mockReadFile: any
    let mockWriteFile: any
    let mockMkdir: any
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        mockReadFile = spyOn(fs, 'readFile')
        mockWriteFile = spyOn(fs, 'writeFile').mockResolvedValue(undefined as any)
        mockMkdir = spyOn(fs, 'mkdir').mockResolvedValue(undefined as any)
        originalEnv = { ...process.env }

        // Clear process.env for these keys
        delete process.env.GEMINI_API_KEY
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        delete process.env.OPENROUTER_API_KEY
    })

    afterEach(() => {
        mock.restore()
        process.env = { ...originalEnv }
    })

    describe('loadConfig', () => {
        test('loads basic config from home dir', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    activeProvider: 'openai',
                    providers: { openai: 'sk-test' },
                })
            })

            const config = await loadConfig()
            expect(config.activeProvider).toBe('openai')
            expect(config.providers.openai).toBe('sk-test')
        })

        test('returns empty providers on completely missing config file', async () => {
            mockReadFile.mockRejectedValue(new Error('ENOENT'))
            const config = await loadConfig()
            expect(config).toEqual({ providers: {} })
        })

        test('deep merges workspace config', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) {
                    return JSON.stringify({ autoScroll: true, providers: { gemini: 'sk-gemini' } })
                }
                return JSON.stringify({
                    autoScroll: false,
                    activeProvider: 'openai',
                    providers: { openai: 'sk-test' },
                })
            })

            const config = await loadConfig()
            expect(config.autoScroll).toBe(true)
            // Note: deepMergeSettings creates a new object for nested objects, combining them.
            expect(config.providers).toEqual({ openai: 'sk-test', gemini: 'sk-gemini' })
        })

        test('self-heals missing activeProvider if providers exist', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace')
                return JSON.stringify({ providers: { first: 'sk-1', second: 'sk-2' } })
            })

            const config = await loadConfig()
            expect(config.activeProvider).toBe('first')
        })
    })

    describe('saveConfig', () => {
        test('writes config object to file', async () => {
            await saveConfig({ providers: { test: 'key' }, activeProvider: 'test' })
            expect(mockMkdir).toHaveBeenCalled()
            expect(mockWriteFile).toHaveBeenCalled()

            const writeArgs = mockWriteFile.mock.calls[0]
            expect(writeArgs[0]).toContain(path.join('.config', 'december', 'config.json'))
            expect(JSON.parse(writeArgs[1])).toEqual({
                providers: { test: 'key' },
                activeProvider: 'test',
            })
        })
    })

    describe('getProviderConfig', () => {
        test('prioritizes december proxy if authPriority is december and token exists', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    authPriority: 'december',
                    decemberToken: 'dec-token',
                    activeProvider: 'openai',
                    providers: { openai: 'sk-test' },
                })
            })

            const providerConfig = await getProviderConfig()
            expect(providerConfig).toEqual({
                provider: 'december_proxy',
                apiKey: 'dec-token',
                authMethod: 'december',
            })
        })

        test('falls back to byok if authPriority is byok', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    authPriority: 'byok',
                    decemberToken: 'dec-token',
                    activeProvider: 'openai',
                    providers: { openai: 'sk-test' },
                })
            })

            const providerConfig = await getProviderConfig()
            expect(providerConfig).toEqual({
                provider: 'openai',
                apiKey: 'sk-test',
                model: undefined,
                authMethod: 'byok',
            })
        })

        test('ignores environment variables when no byok config or december token in config', async () => {
            process.env.GEMINI_API_KEY = 'env-gemini-key'
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({ providers: {} })
            })

            const providerConfig = await getProviderConfig()
            expect(providerConfig).toBeUndefined()
        })

        test('uses december proxy as fallback if no env and no byok', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    decemberToken: 'dec-token',
                    providers: {},
                })
            })

            const providerConfig = await getProviderConfig()
            expect(providerConfig).toEqual({
                provider: 'december_proxy',
                apiKey: 'dec-token',
                authMethod: 'december',
            })
        })

        test('returns undefined if absolutely nothing is configured', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({ providers: {} })
            })

            const providerConfig = await getProviderConfig()
            expect(providerConfig).toBeUndefined()
        })
    })

    describe('getAuthStatus', () => {
        test('returns correct status with byok only', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    activeProvider: 'openai',
                    providers: { openai: 'sk-test' },
                })
            })

            const status = await getAuthStatus()
            expect(status).toEqual({
                hasByok: true,
                hasDecember: false,
                authPriority: 'byok',
            })
        })

        test('returns correct status with december token only', async () => {
            mockReadFile.mockImplementation(async (filePath: string) => {
                if (filePath.includes('settings.json')) throw new Error('No workspace config')
                return JSON.stringify({
                    decemberToken: 'dec-token',
                    providers: {},
                })
            })

            const status = await getAuthStatus()
            expect(status).toEqual({
                hasByok: false,
                hasDecember: true,
                authPriority: 'byok',
            })
        })
    })
})
