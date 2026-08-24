import { exec } from 'node:child_process'

import { loadConfig } from '../config'

import { clearVersionCheckCache } from './version-check'

export type InstallMethod = 'npm' | 'bun' | 'pnpm' | 'yarn' | 'brew' | 'npx' | 'source'

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
    const validMethods: InstallMethod[] = ['npm', 'bun', 'pnpm', 'yarn', 'brew', 'npx', 'source']
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

    // 2. NPX / Bunx ephemeral execution
    if (
        argv1.includes('/_npx/') ||
        argv1.includes('\\_npx\\') ||
        argv1.includes('/.bunx/') ||
        env.npm_config_user_agent?.includes('npx')
    ) {
        return 'npx'
    }

    // 3. Homebrew
    if (
        execPath.includes('/Cellar/december') ||
        execPath.includes('/opt/homebrew/Cellar/december') ||
        argv1.includes('/Cellar/december') ||
        argv1.includes('/opt/homebrew/bin/december')
    ) {
        return 'brew'
    }

    // 4. Bun global
    if (
        argv1.includes('.bun/bin') ||
        argv1.includes('/.bun/') ||
        (execPath.includes('/bun') && !execPath.endsWith('/node'))
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

    // 7. NPM global or standard Node module (default)
    return 'npm'
}

export function getUpdateCommand(
    method: InstallMethod,
    _platform: string = process.platform
): UpdateCommandInfo {
    switch (method) {
        case 'bun': {
            return {
                command: 'bun add -g @trydecember/cli@latest',
                manualCmd: 'bun add -g @trydecember/cli@latest',
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
        case 'npx': {
            return {
                command: 'npx @trydecember/cli@latest',
                manualCmd: 'npx @trydecember/cli@latest',
                description: 'NPX execution (always latest)',
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

    if (method === 'npx') {
        const msg =
            'Running December CLI via npx/bunx. Each invocation automatically uses the latest version.'
        options?.onProgress?.(msg)
        return {
            success: true,
            method: 'npx',
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
