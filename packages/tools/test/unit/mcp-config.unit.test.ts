import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'

import {
    loadMcpConfig,
    saveMcpConfig,
    mergeMcpConfigs,
    interpolateEnv,
    interpolateServerConfig,
} from '../../src/mcp/config'

import type { McpConfigFile, McpServerConfig } from '../../src/mcp/types'

describe('MCP Configuration & Variable Expansion (Unit)', () => {
    const testDir = path.join(os.tmpdir(), `december-mcp-test-${Date.now()}`)
    const workspaceDir = path.join(testDir, 'workspace')
    const globalDir = path.join(testDir, 'global')

    beforeEach(async () => {
        await fs.mkdir(path.join(workspaceDir, '.december'), { recursive: true })
        await fs.mkdir(globalDir, { recursive: true })
    })

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true })
        } catch {
            // Intentionally swallowed: test directory cleanup
        }
    })

    describe('mergeMcpConfigs', () => {
        it('merges global and workspace configs where workspace overrides colliding keys', () => {
            const globalConfig: McpConfigFile = {
                mcpServers: {
                    github: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-github'],
                        env: { GITHUB_TOKEN: 'global-token' },
                    },
                    linear: {
                        command: 'npx',
                        args: ['-y', 'linear-mcp'],
                        env: { LINEAR_KEY: 'lin-global' },
                    },
                },
            }

            const workspaceConfig: McpConfigFile = {
                mcpServers: {
                    github: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-github-custom'],
                        env: { GITHUB_TOKEN: 'workspace-token' },
                        autoApprove: ['create_issue'],
                    },
                    sqlite: {
                        command: 'uvx',
                        args: ['mcp-server-sqlite', '--db-path', './dev.db'],
                    },
                },
            }

            const merged = mergeMcpConfigs(globalConfig, workspaceConfig)

            // Linear should be preserved from global
            expect(merged.mcpServers.linear).toBeDefined()
            expect(merged.mcpServers.linear.env?.LINEAR_KEY).toBe('lin-global')

            // Sqlite should come from workspace
            expect(merged.mcpServers.sqlite).toBeDefined()
            expect(merged.mcpServers.sqlite.command).toBe('uvx')

            // Github should be overridden by workspace
            expect(merged.mcpServers.github.args).toEqual([
                '-y',
                '@modelcontextprotocol/server-github-custom',
            ])
            expect(merged.mcpServers.github.env?.GITHUB_TOKEN).toBe('workspace-token')
            expect(merged.mcpServers.github.autoApprove).toEqual(['create_issue'])
        })

        it('handles empty or missing mcpServers safely', () => {
            const merged = mergeMcpConfigs({} as any, { mcpServers: {} })
            expect(merged.mcpServers).toEqual({})
        })
    })

    describe('interpolateEnv', () => {
        it('expands ${VAR} from provided env map', () => {
            const env = { GITHUB_TOKEN: 'ghp_secret123', HOST: '127.0.0.1' }
            const result = interpolateEnv('Bearer ${GITHUB_TOKEN} at http://${HOST}:8000', env)
            expect(result).toBe('Bearer ghp_secret123 at http://127.0.0.1:8000')
        })

        it('supports default fallback syntax ${VAR:-default}', () => {
            const env = { PORT: '3000' }
            const result = interpolateEnv(
                'http://${HOST:-localhost}:${PORT}/api?key=${KEY:-default_key}',
                env
            )
            expect(result).toBe('http://localhost:3000/api?key=default_key')
        })

        it('replaces undefined variables with empty string when no default is provided', () => {
            const env = {}
            const result = interpolateEnv('--token=${UNDEFINED_TOKEN}--suffix', env)
            expect(result).toBe('--token=--suffix')
        })
    })

    describe('interpolateServerConfig', () => {
        it('interpolates command, args, url, and env object', () => {
            const env = {
                BIN_DIR: '/opt/bin',
                DB_PATH: '/data/prod.db',
                API_KEY: 'secret-key',
                SERVER_URL: 'https://mcp.company.internal/sse',
            }

            const rawConfig: McpServerConfig = {
                command: '${BIN_DIR}/server',
                args: ['--db', '${DB_PATH}', '--port', '${PORT:-8080}'],
                env: {
                    AUTH_HEADER: 'Bearer ${API_KEY}',
                    EMPTY_VAR: '${MISSING_VAR}',
                },
                url: '${SERVER_URL}',
                type: 'stdio',
                autoApprove: ['read_query'],
            }

            const interpolated = interpolateServerConfig(rawConfig, env)

            expect(interpolated.command).toBe('/opt/bin/server')
            expect(interpolated.args).toEqual(['--db', '/data/prod.db', '--port', '8080'])
            expect(interpolated.env?.AUTH_HEADER).toBe('Bearer secret-key')
            expect(interpolated.env?.EMPTY_VAR).toBe('')
            expect(interpolated.url).toBe('https://mcp.company.internal/sse')
            expect(interpolated.autoApprove).toEqual(['read_query'])
        })
    })

    describe('loadMcpConfig and saveMcpConfig', () => {
        it('loads and merges from global and workspace files on disk', async () => {
            const globalConfigFile = path.join(globalDir, 'mcp.json')
            const workspaceConfigFile = path.join(workspaceDir, '.december', 'mcp.json')

            await fs.writeFile(
                globalConfigFile,
                JSON.stringify({
                    mcpServers: {
                        personal_github: {
                            command: 'npx',
                            args: ['-y', '@modelcontextprotocol/server-github'],
                        },
                    },
                })
            )

            await fs.writeFile(
                workspaceConfigFile,
                JSON.stringify({
                    mcpServers: {
                        project_db: {
                            command: 'uvx',
                            args: ['mcp-server-sqlite'],
                        },
                    },
                })
            )

            const config = await loadMcpConfig({
                workspaceDir,
                globalConfigDir: globalDir,
            })

            expect(config.mcpServers.personal_github).toBeDefined()
            expect(config.mcpServers.project_db).toBeDefined()
        })

        it('saves config to workspace or global scope', async () => {
            const newConfig: McpConfigFile = {
                mcpServers: {
                    sqlite: {
                        command: 'uvx',
                        args: ['mcp-server-sqlite'],
                        disabled: true,
                    },
                },
            }

            await saveMcpConfig({
                config: newConfig,
                scope: 'workspace',
                workspaceDir,
            })

            const savedRaw = await fs.readFile(
                path.join(workspaceDir, '.december', 'mcp.json'),
                'utf8'
            )
            const parsed = JSON.parse(savedRaw)
            expect(parsed.mcpServers.sqlite.disabled).toBe(true)
        })
    })
})
