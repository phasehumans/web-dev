import { exec } from 'node:child_process'

import { loadConfig } from '../config'

import { clearVersionCheckCache } from './version-check'

export type InstallMethod = 'curl' | 'npm' | 'bun' | 'pnpm' | 'yarn' | 'brew' | 'source'

export interface UpdateCommandInfo {
    command: string
    description: string
    manualCmd: string
}

export interface UpdateResult {
    success: boolean
    method: InstallMethod
    command: string
    manualCmd: string
    error?: string
    output?: string
}

export interface DetectOptions {
    execPath?: string
    argv1?: string
    env?: Record<string, string | undefined>
    configInstallMethod?: string
}

export function detectInstallMethod(options?: DetectOptions): InstallMethod {
    const configMethod = options?.configInstallMethod
    const validMethods: InstallMethod[] = ['curl', 'npm', 'bun', 'pnpm', 'yarn', 'brew', 'source']
    if (configMethod && validMethods.includes(configMethod as InstallMethod)) {
        return configMethod as InstallMethod
    }

    const execPath = (options?.execPath ?? process.execPath ?? '').replace(/\\/g, '/')
    const argv1 = (
        options?.argv1 ??
        (process.argv.length > 1 ? process.argv[1] : '') ??
        ''
    ).replace(/\\/g, '/')
    const env = options?.env ?? process.env

    // 1. Local source repository
    if (
        argv1.includes('/apps/cli/src') ||
        argv1.includes('/apps/cli/dist') ||
        argv1.includes('december/apps/cli')
    ) {
        return 'source'
    }

    // 2. Homebrew
    if (
        execPath.includes('/Cellar/december') ||
        execPath.includes('/opt/homebrew/Cellar/december') ||
        argv1.includes('/Cellar/december') ||
        argv1.includes('/opt/homebrew/bin/december')
    ) {
        return 'brew'
    }

    // 3. Standalone binary / curl installer
    // e.g. ~/.local/bin/december, %LOCALAPPDATA%\Programs\december\december.exe
    if (
        execPath.includes('.local/bin/december') ||
        execPath.includes('Programs/december') ||
        env.DECEMBER_INSTALL_DIR ||
        (execPath.endsWith('/december') &&
            !execPath.includes('node_modules') &&
            !execPath.includes('bun') &&
            !execPath.includes('node')) ||
        (execPath.endsWith('/december.exe') && !execPath.includes('node_modules'))
    ) {
        return 'curl'
    }

    // 4. Bun global
    if (
        argv1.includes('.bun/bin') ||
        argv1.includes('/.bun/') ||
        (execPath.includes('/bun') && !execPath.endsWith('/december'))
    ) {
        return 'bun'
    }

    // 5. PNPM global
    if (
        argv1.includes('pnpm') ||
        argv1.includes('.pnpm') ||
        (env.PNPM_HOME && argv1.includes(env.PNPM_HOME.replace(/\\/g, '/')))
    ) {
        return 'pnpm'
    }

    // 6. Yarn global
    if (argv1.includes('.yarn/bin') || argv1.includes('/yarn/') || argv1.includes('\\yarn\\')) {
        return 'yarn'
    }

    // 7. NPM global or standard Node module
    if (
        argv1.includes('node_modules/@trydecember') ||
        argv1.includes('node_modules/.bin/december') ||
        argv1.includes('/npm/')
    ) {
        return 'npm'
    }

    // Fallback: if running via node, default to npm; otherwise curl standalone
    if (execPath.endsWith('/node') || execPath.endsWith('/node.exe')) {
        return 'npm'
    }

    return 'curl'
}

export function getUpdateCommand(
    method: InstallMethod,
    platform: string = process.platform
): UpdateCommandInfo {
    switch (method) {
        case 'curl': {
            if (platform === 'win32') {
                const cmd =
                    'powershell.exe -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/phasehumans/december/main/install.ps1 | iex"'
                return {
                    command: cmd,
                    manualCmd:
                        'irm https://raw.githubusercontent.com/phasehumans/december/main/install.ps1 | iex',
                    description: 'Standalone binary via install.ps1',
                }
            }
            const cmd =
                'curl -fsSL https://raw.githubusercontent.com/phasehumans/december/main/install.sh | bash'
            return {
                command: cmd,
                manualCmd:
                    'curl -fsSL https://raw.githubusercontent.com/phasehumans/december/main/install.sh | bash',
                description: 'Standalone binary via install.sh',
            }
        }
        case 'bun': {
            return {
                command: 'bun install -g @trydecember/cli@latest',
                manualCmd: 'bun install -g @trydecember/cli@latest',
                description: 'Bun global package',
            }
        }
        case 'pnpm': {
            return {
                command: 'pnpm add -g @trydecember/cli@latest',
                manualCmd: 'pnpm add -g @trydecember/cli@latest',
                description: 'PNPM global package',
            }
        }
        case 'yarn': {
            return {
                command: 'yarn global add @trydecember/cli@latest',
                manualCmd: 'yarn global add @trydecember/cli@latest',
                description: 'Yarn global package',
            }
        }
        case 'brew': {
            return {
                command: 'brew upgrade december',
                manualCmd: 'brew upgrade december',
                description: 'Homebrew package',
            }
        }
        case 'source': {
            return {
                command: 'git pull && bun install',
                manualCmd: 'git pull && bun install',
                description: 'Local source repository',
            }
        }
        case 'npm':
        default: {
            return {
                command: 'npm install -g @trydecember/cli@latest',
                manualCmd: 'npm install -g @trydecember/cli@latest',
                description: 'NPM global package',
            }
        }
    }
}

export interface PerformUpdateOptions {
    onProgress?: (message: string) => void
    onSuccess?: () => Promise<void> | void
    onError?: (error: string, manualCmd: string) => void
    execFn?: typeof exec
    configInstallMethod?: string
    platform?: string
}

export async function performCliUpdate(options?: PerformUpdateOptions): Promise<UpdateResult> {
    let configInstallMethod = options?.configInstallMethod
    if (!configInstallMethod) {
        try {
            const config = await loadConfig()
            configInstallMethod = config.installMethod
        } catch {
            // Intentionally swallowed: fallback to auto-detecting install method
        }
    }

    const platform = options?.platform ?? process.platform
    const method = detectInstallMethod({ configInstallMethod })
    const { command, manualCmd, description } = getUpdateCommand(method, platform)

    if (method === 'source') {
        const msg = 'Running December CLI from local source development directory.'
        options?.onProgress?.(msg)
        return {
            success: true,
            method: 'source',
            command,
            manualCmd,
            output: msg,
        }
    }

    options?.onProgress?.(`Updating December CLI via ${description}...`)

    const execCommand = options?.execFn ?? exec

    return new Promise<UpdateResult>((resolve) => {
        execCommand(command, { timeout: 120_000 }, async (error, stdout, stderr) => {
            if (error) {
                const errMessage = (stderr || error.message || 'Unknown update failure').trim()
                options?.onError?.(errMessage, manualCmd)
                resolve({
                    success: false,
                    method,
                    command,
                    manualCmd,
                    error: errMessage,
                })
                return
            }

            try {
                await clearVersionCheckCache()
            } catch {
                // Intentionally swallowed: version check cache clearing failure should not block success
            }

            if (options?.onSuccess) {
                try {
                    await options.onSuccess()
                } catch {
                    // Intentionally swallowed: optional success hook failure ignored
                }
            }

            resolve({
                success: true,
                method,
                command,
                manualCmd,
                output: (stdout || 'Update completed successfully.').trim(),
            })
        })
    })
}
