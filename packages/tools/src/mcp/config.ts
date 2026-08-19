import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { McpConfigFile, McpServerConfig } from './types'

export function interpolateEnv(
    value: string,
    env: Record<string, string | undefined> = process.env
): string {
    return value.replace(/\$\{([^}]+)\}/g, (_, expression) => {
        if (expression.includes(':-')) {
            const [varName, defaultValue] = expression.split(':-')
            const val = env[varName]
            return val !== undefined && val !== '' ? val : defaultValue
        }
        const val = env[expression]
        return val !== undefined ? val : ''
    })
}

export function interpolateServerConfig(
    config: McpServerConfig,
    env: Record<string, string | undefined> = process.env
): McpServerConfig {
    const result: McpServerConfig = { ...config }

    if (result.command) {
        result.command = interpolateEnv(result.command, env)
    }

    if (result.args && Array.isArray(result.args)) {
        result.args = result.args.map((arg) => interpolateEnv(arg, env))
    }

    if (result.url) {
        result.url = interpolateEnv(result.url, env)
    }

    if (result.env && typeof result.env === 'object') {
        const expandedEnv: Record<string, string> = {}
        for (const [key, val] of Object.entries(result.env)) {
            if (typeof val === 'string') {
                expandedEnv[key] = interpolateEnv(val, env)
            } else {
                expandedEnv[key] = val
            }
        }
        result.env = expandedEnv
    }

    return result
}

export function mergeMcpConfigs(
    globalConfig: McpConfigFile,
    workspaceConfig: McpConfigFile
): McpConfigFile {
    return {
        mcpServers: {
            ...(globalConfig?.mcpServers || {}),
            ...(workspaceConfig?.mcpServers || {}),
        },
    }
}

export interface LoadMcpConfigOptions {
    workspaceDir?: string
    globalConfigDir?: string
    env?: Record<string, string | undefined>
}

export async function loadMcpConfig(options: LoadMcpConfigOptions = {}): Promise<McpConfigFile> {
    const workspaceDir = options.workspaceDir || process.cwd()
    const globalConfigDir =
        options.globalConfigDir || path.join(os.homedir(), '.config', 'december')

    let globalConfig: McpConfigFile = { mcpServers: {} }
    let workspaceConfig: McpConfigFile = { mcpServers: {} }

    // 1. Read global mcp.json
    try {
        const globalPath = path.join(globalConfigDir, 'mcp.json')
        const raw = await fs.readFile(globalPath, 'utf8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.mcpServers === 'object') {
            globalConfig = parsed
        }
    } catch {
        // Global config is optional
    }

    // 2. Read workspace .december/mcp.json
    try {
        const workspacePath = path.join(workspaceDir, '.december', 'mcp.json')
        const raw = await fs.readFile(workspacePath, 'utf8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.mcpServers === 'object') {
            workspaceConfig = parsed
        }
    } catch {
        // Workspace config is optional
    }

    return mergeMcpConfigs(globalConfig, workspaceConfig)
}

export interface SaveMcpConfigOptions {
    config: McpConfigFile
    scope?: 'workspace' | 'global'
    workspaceDir?: string
    globalConfigDir?: string
}

export async function saveMcpConfig(options: SaveMcpConfigOptions): Promise<void> {
    const { config, scope = 'workspace' } = options
    const targetDir =
        scope === 'workspace'
            ? path.join(options.workspaceDir || process.cwd(), '.december')
            : options.globalConfigDir || path.join(os.homedir(), '.config', 'december')

    const targetFile = path.join(targetDir, 'mcp.json')
    await fs.mkdir(targetDir, { recursive: true })
    await fs.writeFile(targetFile, JSON.stringify(config, null, 2) + '\n', 'utf8')
}
