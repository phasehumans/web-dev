import { describe, expect, test } from 'bun:test'

import { detectInstallMethod, getUpdateCommand, performCliUpdate } from '../src/utils/updater'

describe('CLI Updater & Install Method Detection (Unit)', () => {
    describe('detectInstallMethod', () => {
        test('respects explicit config installMethod if valid', () => {
            expect(detectInstallMethod({ configInstallMethod: 'bun' })).toBe('bun')
            expect(detectInstallMethod({ configInstallMethod: 'pnpm' })).toBe('pnpm')
            expect(detectInstallMethod({ configInstallMethod: 'yarn' })).toBe('yarn')
            expect(detectInstallMethod({ configInstallMethod: 'brew' })).toBe('brew')
            expect(detectInstallMethod({ configInstallMethod: 'npm' })).toBe('npm')
            expect(detectInstallMethod({ configInstallMethod: 'npx' })).toBe('npx')
            expect(detectInstallMethod({ configInstallMethod: 'source' })).toBe('source')
        })

        test('detects homebrew installation', () => {
            const method = detectInstallMethod({
                execPath: '/opt/homebrew/Cellar/december/0.3.13/bin/december',
                argv1: '/opt/homebrew/bin/december',
            })
            expect(method).toBe('brew')
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

        test('detects yarn global installation', () => {
            const method = detectInstallMethod({
                execPath: '/usr/local/bin/node',
                argv1: '/home/user/.yarn/bin/december',
            })
            expect(method).toBe('yarn')
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

        test('returns yarn update command', () => {
            const info = getUpdateCommand('yarn')
            expect(info.command).toBe('yarn global add @trydecember/cli@latest')
        })

        test('returns brew update command', () => {
            const info = getUpdateCommand('brew')
            expect(info.command).toBe('brew upgrade december')
        })

        test('returns npx command for npx mode', () => {
            const info = getUpdateCommand('npx')
            expect(info.command).toBe('npx @trydecember/cli@latest')
        })

        test('returns git pull command for source development', () => {
            const info = getUpdateCommand('source')
            expect(info.command).toBe('git pull && bun install')
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
            expect(result.command).toBe('git pull && bun install')
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
                execFn: mockExec,
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

        test('handles update errors and passes manual instruction', async () => {
            const mockExec: any = (cmd: string, opts: any, callback: any) => {
                callback(new Error('EACCES: permission denied'), '', 'EACCES: permission denied')
            }

            let errorCalled = false
            let reportedManualCmd = ''

            const result = await performCliUpdate({
                configInstallMethod: 'npm',
                execFn: mockExec,
                onError: (err, manualCmd) => {
                    errorCalled = true
                    reportedManualCmd = manualCmd
                },
            })

            expect(result.success).toBe(false)
            expect(result.method).toBe('npm')
            expect(result.error).toContain('EACCES')
            expect(errorCalled).toBe(true)
            expect(reportedManualCmd).toBe('npm install -g @trydecember/cli@latest')
        })
    })
})
