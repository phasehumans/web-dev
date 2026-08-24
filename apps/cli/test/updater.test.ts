import { describe, expect, test } from 'bun:test'

import { detectInstallMethod, getUpdateCommand, performCliUpdate } from '../src/utils/updater'

describe('CLI Updater & Install Method Detection (Unit)', () => {
    describe('detectInstallMethod', () => {
        test('respects explicit config installMethod if valid', () => {
            expect(detectInstallMethod({ configInstallMethod: 'curl' })).toBe('curl')
            expect(detectInstallMethod({ configInstallMethod: 'bun' })).toBe('bun')
            expect(detectInstallMethod({ configInstallMethod: 'pnpm' })).toBe('pnpm')
            expect(detectInstallMethod({ configInstallMethod: 'yarn' })).toBe('yarn')
            expect(detectInstallMethod({ configInstallMethod: 'brew' })).toBe('brew')
            expect(detectInstallMethod({ configInstallMethod: 'npm' })).toBe('npm')
            expect(detectInstallMethod({ configInstallMethod: 'source' })).toBe('source')
        })

        test('detects curl install from ~/.local/bin path', () => {
            const method = detectInstallMethod({
                execPath: '/home/user/.local/bin/december',
                argv1: '/home/user/.local/bin/december',
            })
            expect(method).toBe('curl')
        })

        test('detects curl install from Windows Programs directory', () => {
            const method = detectInstallMethod({
                execPath: 'C:\\Users\\User\\AppData\\Local\\Programs\\december\\december.exe',
                argv1: 'C:\\Users\\User\\AppData\\Local\\Programs\\december\\december.exe',
            })
            expect(method).toBe('curl')
        })

        test('detects curl install when DECEMBER_INSTALL_DIR is set in env', () => {
            const method = detectInstallMethod({
                execPath: '/opt/custom/december',
                argv1: '/opt/custom/december',
                env: { DECEMBER_INSTALL_DIR: '/opt/custom' },
            })
            expect(method).toBe('curl')
        })

        test('detects standalone compiled binary', () => {
            const method = detectInstallMethod({
                execPath: '/usr/bin/december',
                argv1: '/usr/bin/december',
            })
            expect(method).toBe('curl')
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

        test('detects npm global installation', () => {
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
        test('returns curl installer command on Linux/macOS', () => {
            const info = getUpdateCommand('curl', 'linux')
            expect(info.command).toContain('curl -fsSL')
            expect(info.command).toContain('install.sh')
            expect(info.manualCmd).toContain('curl -fsSL')
        })

        test('returns powershell installer command on Windows', () => {
            const info = getUpdateCommand('curl', 'win32')
            expect(info.command).toContain('powershell.exe')
            expect(info.command).toContain('install.ps1')
            expect(info.manualCmd).toContain('install.ps1')
        })

        test('returns bun update command', () => {
            const info = getUpdateCommand('bun')
            expect(info.command).toBe('bun install -g @trydecember/cli@latest')
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
            expect(executedCommand).toBe('bun install -g @trydecember/cli@latest')
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
