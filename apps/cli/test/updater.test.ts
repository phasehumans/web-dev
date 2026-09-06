import { describe, expect, test } from 'bun:test'

import { detectInstallMethod, getUpdateCommand, performCliUpdate } from '../src/utils/updater'

describe('CLI Updater & Install Method Detection (Unit)', () => {
    describe('detectInstallMethod', () => {
        test('respects explicit config installMethod if valid', () => {
            expect(detectInstallMethod({ configInstallMethod: 'bun' })).toBe('bun')
            expect(detectInstallMethod({ configInstallMethod: 'pnpm' })).toBe('pnpm')
            expect(detectInstallMethod({ configInstallMethod: 'npm' })).toBe('npm')
            expect(detectInstallMethod({ configInstallMethod: 'npx' })).toBe('npx')
            expect(detectInstallMethod({ configInstallMethod: 'source' })).toBe('source')
        })

        test('detects bun global installation', () => {
            const method = detectInstallMethod({
                execPath: '/home/user/.bun/bin/bun',
                argv1: '/home/user/.bun/bin/december',
            })
            expect(method).toBe('bun')
        })

        test('detects pnpm global installation', () => {
            const method = detectInstallMethod({
                execPath: '/usr/local/bin/node',
                argv1: '/home/user/.local/share/pnpm/global/5/node_modules/@trydecember/cli/dist/december.js',
            })
            expect(method).toBe('pnpm')
        })

        test('detects npx ephemeral execution', () => {
            const method = detectInstallMethod({
                execPath: '/usr/local/bin/node',
                argv1: '/home/user/.npm/_npx/12345/node_modules/@trydecember/cli/dist/december.js',
            })
            expect(method).toBe('npx')
        })

        test('detects npm global installation by default', () => {
            const method = detectInstallMethod({
                execPath: '/usr/local/bin/node',
                argv1: '/usr/local/lib/node_modules/@trydecember/cli/dist/december.js',
            })
            expect(method).toBe('npm')
        })

        test('detects local source repository execution', () => {
            const method = detectInstallMethod({
                execPath: '/usr/local/bin/bun',
                argv1: '/home/user/code/december/apps/cli/src/index.ts',
            })
            expect(method).toBe('source')
        })
    })

    describe('getUpdateCommand', () => {
        test('returns bun update command', () => {
            const info = getUpdateCommand('bun')
            expect(info.command).toBe('bun add -g @trydecember/cli@latest')
        })

        test('returns npm update command', () => {
            const info = getUpdateCommand('npm')
            expect(info.command).toBe('npm install -g @trydecember/cli@latest')
        })

        test('returns pnpm update command', () => {
            const info = getUpdateCommand('pnpm')
            expect(info.command).toBe('pnpm add -g @trydecember/cli@latest')
        })

        test('returns npx command for npx mode', () => {
            const info = getUpdateCommand('npx')
            expect(info.command).toBe('npx @trydecember/cli@latest')
        })

        test('returns git pull command for source development', () => {
            const info = getUpdateCommand('source')
            expect(info.command).toBe('git pull && bun install && bun --cwd apps/cli run build')
        })
    })

    describe('performCliUpdate', () => {
        test('handles source development mode without executing child process', async () => {
            let progressMsg = ''
            const result = await performCliUpdate({
                configInstallMethod: 'source',
                onProgress: (msg) => {
                    progressMsg = msg
                },
            })

            expect(result.success).toBe(true)
            expect(result.method).toBe('source')
            expect(result.command).toBe('git pull && bun install && bun --cwd apps/cli run build')
            expect(progressMsg).toContain('source development')
        })

        test('handles npx mode without executing child process', async () => {
            let progressMsg = ''
            const result = await performCliUpdate({
                configInstallMethod: 'npx',
                onProgress: (msg) => {
                    progressMsg = msg
                },
            })

            expect(result.success).toBe(true)
            expect(result.method).toBe('npx')
            expect(result.command).toBe('npx @trydecember/cli@latest')
            expect(progressMsg).toContain('npx/bunx')
        })

        test('executes update command and handles success', async () => {
            let executedCommand = ''
            const mockExec: any = (cmd: string, opts: any, callback: any) => {
                executedCommand = cmd
                callback(null, 'Updated successfully to 0.3.14', '')
            }

            let progressCalled = false
            let successCalled = false

            const result = await performCliUpdate({
                configInstallMethod: 'bun',
                force: true,
                fetchLatestFn: async () => '1.0.0',
                execFn: mockExec,
                skipVerification: true,
                onProgress: () => {
                    progressCalled = true
                },
                onSuccess: () => {
                    successCalled = true
                },
            })

            expect(result.success).toBe(true)
            expect(result.method).toBe('bun')
            expect(executedCommand).toBe('bun add -g @trydecember/cli@latest')
            expect(progressCalled).toBe(true)
            expect(successCalled).toBe(true)
        })

        test('handles update errors and passes sudo instruction on permission errors', async () => {
            const mockExec: any = (cmd: string, opts: any, callback: any) => {
                callback(new Error('EACCES: permission denied'), '', 'EACCES: permission denied')
            }

            let errorCalled = false
            let reportedManualCmd = ''

            const result = await performCliUpdate({
                configInstallMethod: 'npm',
                force: true,
                fetchLatestFn: async () => '1.0.0',
                execFn: mockExec,
                skipVerification: true,
                onError: (err, manualCmd) => {
                    errorCalled = true
                    reportedManualCmd = manualCmd
                },
            })

            expect(result.success).toBe(false)
            expect(result.method).toBe('npm')
            expect(result.error).toContain('EACCES')
            expect(result.isPermissionError).toBe(true)
            expect(result.sudoCmd).toBe('sudo npm install -g @trydecember/cli@latest')
            expect(errorCalled).toBe(true)
            expect(reportedManualCmd).toBe('sudo npm install -g @trydecember/cli@latest')
        })

        test('returns alreadyUpToDate fast path when current version matches target', async () => {
            let execCalled = false
            const mockExec: any = () => {
                execCalled = true
            }

            const result = await performCliUpdate({
                configInstallMethod: 'npm',
                currentVersion: '0.3.22',
                fetchLatestFn: async () => '0.3.22',
                execFn: mockExec,
                skipVerification: true,
            })

            expect(result.success).toBe(true)
            expect(result.alreadyUpToDate).toBe(true)
            expect(execCalled).toBe(false)
        })

        test('bypasses alreadyUpToDate when force is true', async () => {
            let execCalled = false
            const mockExec: any = (cmd: string, opts: any, callback: any) => {
                execCalled = true
                callback(null, 'Updated', '')
            }

            const result = await performCliUpdate({
                configInstallMethod: 'npm',
                currentVersion: '0.3.22',
                fetchLatestFn: async () => '0.3.22',
                force: true,
                execFn: mockExec,
                skipVerification: true,
            })

            expect(result.success).toBe(true)
            expect(result.alreadyUpToDate).toBeUndefined()
            expect(execCalled).toBe(true)
        })

        test('fails and reports shadowing binary when active binary in PATH remains stale after install', async () => {
            const mockExec: any = (_cmd: string, _opts: any, callback: any) => {
                callback(null, 'Updated global package successfully', '')
            }

            const result = await performCliUpdate({
                configInstallMethod: 'npm',
                currentVersion: '0.3.20',
                fetchLatestFn: async () => '0.3.25',
                execFn: mockExec,
                skipVerification: false,
                diagnoseFn: async () => ({
                    activeBinary: {
                        path: '/home/user/.bun/bin/december',
                        realPath: '/home/user/.bun/bin/december',
                        manager: 'bun',
                        version: '0.3.20',
                        isSymlink: false,
                        isActive: true,
                        isShadowed: false,
                    },
                    allBinaries: [
                        {
                            path: '/home/user/.bun/bin/december',
                            realPath: '/home/user/.bun/bin/december',
                            manager: 'bun',
                            version: '0.3.20',
                            isSymlink: false,
                            isActive: true,
                            isShadowed: false,
                        },
                        {
                            path: '/home/user/.nvm/versions/node/v22/bin/december',
                            realPath: '/home/user/.nvm/versions/node/v22/bin/december',
                            manager: 'npm',
                            version: '0.3.25',
                            isSymlink: false,
                            isActive: false,
                            isShadowed: true,
                        },
                    ],
                    shadowedBinaries: [],
                    hasCollision: true,
                    hasStaleActive: true,
                    latestInstalledVersion: '0.3.25',
                }),
                cleanFn: async () => ({
                    cleanedOrForwarded: [],
                    failedBinaries: [
                        {
                            path: '/home/user/.bun/bin/december',
                            error: 'EACCES: permission denied',
                            needsSudo: true,
                        },
                    ],
                }),
            })

            expect(result.success).toBe(false)
            expect(result.verified).toBe(false)
            expect(result.shadowingBinary?.path).toBe('/home/user/.bun/bin/december')
            expect(result.error).toContain('runs v0.3.20')
            expect(result.failedBinaries?.length).toBe(1)
            expect(result.failedBinaries?.[0].needsSudo).toBe(true)
        })

        test('succeeds when active binary matches target version', async () => {
            const mockExec: any = (_cmd: string, _opts: any, callback: any) => {
                callback(null, 'Updated global package successfully', '')
            }

            const result = await performCliUpdate({
                configInstallMethod: 'bun',
                currentVersion: '0.3.20',
                fetchLatestFn: async () => '0.3.25',
                execFn: mockExec,
                skipVerification: false,
                diagnoseFn: async () => ({
                    activeBinary: {
                        path: '/home/user/.bun/bin/december',
                        realPath: '/home/user/.bun/bin/december',
                        manager: 'bun',
                        version: '0.3.25',
                        isSymlink: false,
                        isActive: true,
                        isShadowed: false,
                    },
                    allBinaries: [],
                    shadowedBinaries: [],
                    hasCollision: false,
                    hasStaleActive: false,
                    latestInstalledVersion: '0.3.25',
                }),
            })

            expect(result.success).toBe(true)
            expect(result.verified).toBe(true)
            expect(result.activeVersion).toBe('0.3.25')
        })
    })
})
