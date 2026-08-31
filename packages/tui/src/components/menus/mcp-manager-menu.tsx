import { MCP_CATALOG, type McpCatalogPreset, type McpCatalogEnvPrompt } from '@december/tools'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export type McpPresetEnvPrompt = McpCatalogEnvPrompt
export type McpPreset = McpCatalogPreset

export const DEFAULT_CATALOG_PRESETS: McpPreset[] = MCP_CATALOG

export interface McpManagerMenuProps {
    mcpServerInfos?: any[]
    agent?: any
    handleToggleMcpServer?: (serverName: string) => Promise<void> | void
    handleReloadMcp?: () => Promise<void> | void
    handleAddMcpServer?: (
        name: string,
        config: any,
        scope?: 'workspace' | 'global'
    ) => Promise<void> | void
    handleRemoveMcpServer?: (
        serverName: string,
        scope?: 'workspace' | 'global'
    ) => Promise<void> | void
    handleTestMcpServer?: (serverName: string) => Promise<any>
    catalogPresets?: McpPreset[]
    setAuthMode: (mode: string) => void
}

function maskEnvValue(val: string): string {
    if (!val) return ''
    if (val.startsWith('${') && val.endsWith('}')) return val
    if (val.length <= 6) return '******'
    return `${val.substring(0, 3)}****${val.substring(val.length - 2)}`
}

export function McpManagerMenu({
    mcpServerInfos: propServerInfos,
    agent,
    handleToggleMcpServer,
    handleReloadMcp,
    handleAddMcpServer,
    handleRemoveMcpServer,
    handleTestMcpServer,
    catalogPresets = DEFAULT_CATALOG_PRESETS,
    setAuthMode,
}: McpManagerMenuProps) {
    const serverInfos = propServerInfos || (agent?.mcpPool ? agent.mcpPool.getServerInfos() : [])

    const [mode, setMode] = useState<'list' | 'catalog' | 'preset_env' | 'confirm_delete'>('list')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [catalogIndex, setCatalogIndex] = useState(0)

    // Form state for preset installation
    const [activePreset, setActivePreset] = useState<McpPreset | null>(null)
    const [promptIndex, setPromptIndex] = useState(0)
    const [promptValues, setPromptValues] = useState<Record<string, string>>({})
    const [currentInputValue, setCurrentInputValue] = useState('')
    const [selectedScope, setSelectedScope] = useState<'workspace' | 'global'>('workspace')

    // Test result feedback state
    const [testStatus, setTestStatus] = useState<
        Record<string, { status: 'testing' | 'ok' | 'failed'; message: string }>
    >({})

    const handleInstallPreset = async (preset: McpPreset, values: Record<string, string>) => {
        const serverConfig: any = {
            ...preset.config,
            description: preset.description,
            catalogId: preset.id,
        }

        if (preset.config.args) {
            serverConfig.args = preset.config.args.map((arg) => {
                let replaced = arg
                for (const [key, val] of Object.entries(values)) {
                    replaced = replaced.replace(new RegExp(`\\$\\{${key}(:-[^}]*)?\\}`, 'g'), val)
                }
                return replaced
            })
        }

        if (preset.config.env) {
            const env: Record<string, string> = {}
            for (const [k, v] of Object.entries(preset.config.env)) {
                let val = v
                for (const [envKey, envVal] of Object.entries(values)) {
                    val = val.replace(new RegExp(`\\$\\{${envKey}(:-[^}]*)?\\}`, 'g'), envVal)
                }
                env[k] = val
            }
            serverConfig.env = env
        }

        if (handleAddMcpServer) {
            await handleAddMcpServer(preset.id, serverConfig, selectedScope)
        }

        setMode('list')
        setActivePreset(null)
        setPromptIndex(0)
        setPromptValues({})
        setCurrentInputValue('')
    }

    useInput((input, key) => {
        if (mode === 'preset_env') {
            if (key.escape) {
                setMode('catalog')
                setActivePreset(null)
                setPromptIndex(0)
                setPromptValues({})
                setCurrentInputValue('')
                return
            }
            if (key.tab) {
                setSelectedScope((prev) => (prev === 'workspace' ? 'global' : 'workspace'))
                return
            }
            return
        }

        if (mode === 'confirm_delete') {
            if (key.escape || input === 'n' || input === 'N') {
                setMode('list')
                return
            }
            if (key.return || input === 'y' || input === 'Y') {
                const current = serverInfos[selectedIndex]
                if (current && handleRemoveMcpServer) {
                    handleRemoveMcpServer(current.name)
                }
                setMode('list')
                setSelectedIndex((prev) => Math.max(0, prev - 1))
                return
            }
            return
        }

        if (mode === 'catalog') {
            if (key.escape) {
                setMode('list')
                return
            }
            if (key.upArrow || input === 'k') {
                setCatalogIndex((prev) => (prev > 0 ? prev - 1 : catalogPresets.length - 1))
            } else if (key.downArrow || input === 'j') {
                setCatalogIndex((prev) => (prev < catalogPresets.length - 1 ? prev + 1 : 0))
            } else if (key.return || input === ' ') {
                const selected = catalogPresets[catalogIndex]
                if (selected) {
                    if (selected.envPrompts && selected.envPrompts.length > 0) {
                        setActivePreset(selected)
                        setPromptIndex(0)
                        setPromptValues({})
                        setCurrentInputValue(selected.envPrompts[0]?.defaultValue || '')
                        setMode('preset_env')
                    } else {
                        handleInstallPreset(selected, {})
                    }
                }
            }
            return
        }

        // Mode === 'list'
        if (key.escape) {
            setAuthMode('none')
            return
        }

        if (input === 'a') {
            setMode('catalog')
            return
        }

        if (serverInfos.length === 0) return

        if (key.upArrow || input === 'k') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : serverInfos.length - 1))
        } else if (key.downArrow || input === 'j') {
            setSelectedIndex((prev) => (prev < serverInfos.length - 1 ? prev + 1 : 0))
        } else if (key.return || input === 'd' || input === ' ') {
            const current = serverInfos[selectedIndex]
            if (current && handleToggleMcpServer) {
                handleToggleMcpServer(current.name)
            }
        } else if (input === 'x' || key.delete || key.backspace) {
            setMode('confirm_delete')
        } else if (input === 't') {
            const current = serverInfos[selectedIndex]
            if (current && handleTestMcpServer) {
                setTestStatus((prev) => ({
                    ...prev,
                    [current.name]: { status: 'testing', message: 'Testing connection...' },
                }))
                handleTestMcpServer(current.name).then((res: any) => {
                    if (res?.success) {
                        setTestStatus((prev) => ({
                            ...prev,
                            [current.name]: {
                                status: 'ok',
                                message: `Connected (${res.latencyMs}ms, ${res.toolsCount} tools)`,
                            },
                        }))
                    } else {
                        setTestStatus((prev) => ({
                            ...prev,
                            [current.name]: {
                                status: 'failed',
                                message: `Failed: ${res?.error || 'Connection refused'}`,
                            },
                        }))
                    }
                })
            }
        } else if (input === 'r') {
            if (handleReloadMcp) {
                handleReloadMcp()
            }
        }
    })

    const selectedServer = serverInfos[selectedIndex]

    // 1. Confirm Delete View
    if (mode === 'confirm_delete' && selectedServer) {
        return (
            <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
                <Box marginBottom={1}>
                    <Text color={THEME.colors.text}>
                        MCP Servers <Text color={THEME.colors.dim}>›</Text>{' '}
                        <Text color={THEME.colors.error}>Remove Server</Text>
                    </Text>
                </Box>

                <Box
                    borderColor={THEME.colors.border}
                    borderStyle="round"
                    flexDirection="column"
                    paddingX={1}
                    marginY={1}
                >
                    <Box marginBottom={1}>
                        <Text color={THEME.colors.error}>
                            Are you sure you want to remove server &quot;{selectedServer.name}&quot;
                            from configuration?
                        </Text>
                    </Box>
                    <Text color={THEME.colors.dim}>
                        This will permanently delete the server entry from mcp.json.
                    </Text>
                </Box>

                <MenuFooter
                    items={[
                        { key: 'enter/y', label: 'Confirm' },
                        { key: 'esc/n', label: 'Cancel' },
                    ]}
                />
            </Box>
        )
    }

    // 2. Preset Environment Variable Prompt View
    if (mode === 'preset_env' && activePreset && activePreset.envPrompts) {
        const currentPrompt = activePreset.envPrompts[promptIndex]
        const totalPrompts = activePreset.envPrompts.length

        const handleSubmitValue = (val: string) => {
            const finalVal = val.trim() || currentPrompt?.defaultValue || ''
            const updatedValues = {
                ...promptValues,
                [currentPrompt?.key || '']: finalVal,
            }
            setPromptValues(updatedValues)

            if (promptIndex < totalPrompts - 1) {
                setPromptIndex(promptIndex + 1)
                const nextPrompt = activePreset.envPrompts![promptIndex + 1]
                setCurrentInputValue(nextPrompt?.defaultValue || '')
            } else {
                handleInstallPreset(activePreset, updatedValues)
            }
        }

        return (
            <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
                <Box marginBottom={1}>
                    <Text color={THEME.colors.text}>
                        MCP Servers <Text color={THEME.colors.dim}>›</Text> Configure{' '}
                        <Text color={THEME.colors.brand}>{activePreset.name}</Text>
                    </Text>
                </Box>

                <Box flexDirection="column" marginY={1}>
                    <Text color={THEME.colors.muted}>
                        Step {promptIndex + 1} of {totalPrompts}: {currentPrompt?.label}
                    </Text>

                    <Box marginTop={1}>
                        <Text color={THEME.colors.brand}>{`${THEME.glyphs.prompt} `}</Text>
                        <TextInput
                            value={currentInputValue}
                            onChange={setCurrentInputValue}
                            onSubmit={handleSubmitValue}
                            placeholder={currentPrompt?.placeholder || 'Enter value...'}
                            mask={currentPrompt?.secret ? '*' : undefined}
                        />
                    </Box>

                    <Box marginTop={1} flexDirection="row" gap={2}>
                        <Text color={THEME.colors.dim}>Scope: </Text>
                        <Text
                            color={
                                selectedScope === 'workspace'
                                    ? THEME.colors.brand
                                    : THEME.colors.dim
                            }
                        >
                            [Workspace: .december/mcp.json]
                        </Text>
                        <Text
                            color={
                                selectedScope === 'global' ? THEME.colors.brand : THEME.colors.dim
                            }
                        >
                            [Global: ~/.config/december/mcp.json]
                        </Text>
                    </Box>
                </Box>

                <MenuFooter
                    items={[
                        {
                            key: 'enter',
                            label: promptIndex === totalPrompts - 1 ? 'Save & Connect' : 'Next',
                        },
                        { key: 'tab', label: 'Toggle Scope' },
                        { key: 'esc', label: 'Cancel' },
                    ]}
                />
            </Box>
        )
    }

    // 3. Preset Catalog Browser View
    if (mode === 'catalog') {
        const selectedPreset = catalogPresets[catalogIndex]
        const isInstalled =
            selectedPreset && serverInfos.some((s: any) => s.name === selectedPreset.id)

        return (
            <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
                <Box marginBottom={1} justifyContent="space-between">
                    <Text color={THEME.colors.text}>
                        MCP Servers <Text color={THEME.colors.dim}>›</Text>{' '}
                        <Text color={THEME.colors.brand}>Preset Catalog</Text>
                    </Text>
                    <Text color={THEME.colors.muted}>{catalogPresets.length} presets</Text>
                </Box>

                <Box flexDirection="column" marginY={1}>
                    {catalogPresets.map((preset, idx) => {
                        const isSelected = idx === catalogIndex
                        const installed = serverInfos.some((s: any) => s.name === preset.id)
                        const presetCmd = preset.config.command
                            ? `${preset.config.command}${preset.config.args && preset.config.args.length > 0 ? ' ' + preset.config.args.join(' ') : ''}`
                            : preset.config.url || ''

                        return (
                            <Box key={preset.id} flexDirection="row" gap={1}>
                                <Box marginRight={0}>
                                    <Text color={THEME.colors.brand}>
                                        {isSelected ? THEME.glyphs.selector : ' '}
                                    </Text>
                                </Box>
                                <Text color={isSelected ? THEME.colors.brand : THEME.colors.text}>
                                    {preset.name}
                                </Text>
                                <Text color={THEME.colors.dim}>[{preset.category}]</Text>
                                {presetCmd && <Text color={THEME.colors.dim}>- {presetCmd}</Text>}
                                {installed && <Text color={THEME.colors.success}>[Installed]</Text>}
                            </Box>
                        )
                    })}
                </Box>

                {selectedPreset && (
                    <Box
                        borderColor={THEME.colors.border}
                        borderStyle="round"
                        flexDirection="column"
                        marginTop={1}
                        paddingX={1}
                    >
                        <Text color={THEME.colors.muted}>{selectedPreset.description}</Text>
                        {selectedPreset.config.autoApprove &&
                            selectedPreset.config.autoApprove.length > 0 && (
                                <Box marginTop={1}>
                                    <Text color={THEME.colors.muted}>
                                        Auto-approved:{' '}
                                        <Text color={THEME.colors.brand}>
                                            {selectedPreset.config.autoApprove.join(', ')}
                                        </Text>
                                    </Text>
                                </Box>
                            )}
                    </Box>
                )}

                <MenuFooter
                    items={[
                        { key: '↑/↓', label: 'Navigate' },
                        { key: 'enter', label: isInstalled ? 'Reconfigure' : 'Install' },
                        { key: 'esc', label: 'Back' },
                    ]}
                />
            </Box>
        )
    }

    // 4. Main Server List View
    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1} justifyContent="space-between">
                <Text color={THEME.colors.text}>MCP Servers</Text>
                <Text color={THEME.colors.muted}>{serverInfos.length} configured</Text>
            </Box>

            {serverInfos.length === 0 ? (
                <Box flexDirection="column" marginY={1}>
                    <Text color={THEME.colors.muted}>
                        No MCP servers configured in .december/mcp.json or
                        ~/.config/december/mcp.json.
                    </Text>
                    <Box marginTop={1}>
                        <Text color={THEME.colors.brand}>
                            Press &apos;a&apos; to browse the Preset Catalog (GitHub, PostgreSQL,
                            SQLite, Brave Search, etc.)
                        </Text>
                    </Box>
                </Box>
            ) : (
                <Box flexDirection="column" marginY={1}>
                    {serverInfos.map((srv: any, idx: number) => {
                        const isSelected = idx === selectedIndex
                        const statusColor =
                            srv.status === 'connected'
                                ? THEME.colors.success
                                : srv.status === 'failed'
                                  ? THEME.colors.error
                                  : THEME.colors.dim

                        const statusGlyph =
                            srv.status === 'connected'
                                ? THEME.glyphs.status
                                : srv.status === 'failed'
                                  ? '▲'
                                  : '○'

                        const toolCount = srv.tools?.length || 0
                        const latencyStr = srv.latencyMs !== undefined ? `, ${srv.latencyMs}ms` : ''
                        const inlineTest = testStatus[srv.name]
                        const cmdStr = srv.config?.command
                            ? `${srv.config.command}${srv.config.args && srv.config.args.length > 0 ? ' ' + srv.config.args.join(' ') : ''}`
                            : srv.config?.url || ''

                        return (
                            <Box
                                key={srv.name}
                                flexDirection="column"
                                marginBottom={isSelected ? 1 : 0}
                            >
                                <Box flexDirection="row" gap={1}>
                                    <Text color={THEME.colors.brand}>
                                        {isSelected ? THEME.glyphs.selector : ' '}
                                    </Text>
                                    <Text
                                        color={isSelected ? THEME.colors.brand : THEME.colors.text}
                                    >
                                        {srv.name}
                                    </Text>
                                    <Text color={statusColor}>
                                        {statusGlyph} [{srv.status}]
                                    </Text>
                                    <Text color={THEME.colors.muted}>
                                        ({toolCount} tool{toolCount === 1 ? '' : 's'}
                                        {latencyStr})
                                    </Text>
                                    {cmdStr && <Text color={THEME.colors.dim}>- {cmdStr}</Text>}
                                    {inlineTest && (
                                        <Text
                                            color={
                                                inlineTest.status === 'ok'
                                                    ? THEME.colors.success
                                                    : inlineTest.status === 'failed'
                                                      ? THEME.colors.error
                                                      : THEME.colors.warning
                                            }
                                        >
                                            [{inlineTest.message}]
                                        </Text>
                                    )}
                                </Box>

                                {isSelected && (
                                    <Box
                                        borderColor={THEME.colors.border}
                                        borderStyle="round"
                                        flexDirection="column"
                                        marginLeft={2}
                                        marginTop={1}
                                        paddingX={1}
                                    >
                                        {srv.config?.env &&
                                            Object.keys(srv.config.env).length > 0 && (
                                                <Box marginBottom={0}>
                                                    <Text color={THEME.colors.muted}>
                                                        Environment:{' '}
                                                        <Text color={THEME.colors.dim}>
                                                            {Object.entries(srv.config.env)
                                                                .map(
                                                                    ([k, v]) =>
                                                                        `${k}=${maskEnvValue(v as string)}`
                                                                )
                                                                .join(', ')}
                                                        </Text>
                                                    </Text>
                                                </Box>
                                            )}

                                        {srv.error && (
                                            <Box marginTop={1} marginBottom={0}>
                                                <Text color={THEME.colors.error}>
                                                    Error: {srv.error}
                                                </Text>
                                            </Box>
                                        )}

                                        {srv.config?.autoApprove &&
                                            srv.config.autoApprove.length > 0 && (
                                                <Box marginTop={1}>
                                                    <Text color={THEME.colors.muted}>
                                                        Auto-approved:{' '}
                                                        <Text color={THEME.colors.brand}>
                                                            {srv.config.autoApprove.join(', ')}
                                                        </Text>
                                                    </Text>
                                                </Box>
                                            )}

                                        {srv.tools && srv.tools.length > 0 ? (
                                            <Box flexDirection="column" marginTop={1}>
                                                <Text color={THEME.colors.muted}>
                                                    Available Tools ({srv.tools.length}):
                                                </Text>
                                                {srv.tools.map((t: any) => (
                                                    <Box
                                                        key={t.name}
                                                        flexDirection="row"
                                                        marginLeft={1}
                                                        gap={1}
                                                    >
                                                        <Text color={THEME.colors.dim}>
                                                            {THEME.glyphs.bullet}
                                                        </Text>
                                                        <Text color={THEME.colors.brand}>
                                                            {t.name}
                                                        </Text>
                                                        {t.description && (
                                                            <Text color={THEME.colors.muted}>
                                                                - {t.description}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                ))}
                                            </Box>
                                        ) : srv.status === 'connected' ? (
                                            <Text color={THEME.colors.muted}>
                                                No tools exposed by this server.
                                            </Text>
                                        ) : null}
                                    </Box>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            )}

            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'd/enter', label: 'Toggle' },
                    { key: 'a', label: 'Presets / Add' },
                    { key: 't', label: 'Test' },
                    { key: 'x', label: 'Remove' },
                    { key: 'r', label: 'Reload' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
