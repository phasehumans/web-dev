import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export interface McpManagerMenuProps {
    mcpServerInfos?: any[]
    agent?: any
    handleToggleMcpServer?: (serverName: string) => Promise<void> | void
    handleReloadMcp?: () => Promise<void> | void
    setAuthMode: (mode: string) => void
}

export function McpManagerMenu({
    mcpServerInfos: propServerInfos,
    agent,
    handleToggleMcpServer,
    handleReloadMcp,
    setAuthMode,
}: McpManagerMenuProps) {
    const serverInfos = propServerInfos || (agent?.mcpPool ? agent.mcpPool.getServerInfos() : [])

    const [selectedIndex, setSelectedIndex] = useState(0)

    useInput((input, key) => {
        if (key.escape) {
            setAuthMode('none')
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
        } else if (input === 'r') {
            if (handleReloadMcp) {
                handleReloadMcp()
            }
        }
    })

    const selectedServer = serverInfos[selectedIndex]

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text bold color={THEME.colors.text}>
                    MCP Server Manager
                </Text>
            </Box>

            {serverInfos.length === 0 ? (
                <Box flexDirection="column" marginY={1}>
                    <Text color={THEME.colors.muted}>
                        No MCP servers configured in .december/mcp.json or
                        ~/.config/december/mcp.json.
                    </Text>
                    <Box marginTop={1}>
                        <Text color={THEME.colors.dim}>
                            Add a server entry to .december/mcp.json to enable dynamic tools.
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

                        const toolCount = srv.tools?.length || 0

                        return (
                            <Box key={srv.name} flexDirection="column" marginBottom={1}>
                                <Box flexDirection="row" gap={1}>
                                    <Text color={isSelected ? THEME.colors.brand : 'transparent'}>
                                        {isSelected ? '›' : ' '}
                                    </Text>
                                    <Text bold={isSelected} color={THEME.colors.text}>
                                        {srv.name}
                                    </Text>
                                    <Text color={statusColor}>[{srv.status}]</Text>
                                    <Text color={THEME.colors.muted}>
                                        ({toolCount} tool{toolCount === 1 ? '' : 's'})
                                    </Text>
                                </Box>

                                {isSelected && (
                                    <Box
                                        flexDirection="column"
                                        marginLeft={3}
                                        marginTop={1}
                                        paddingLeft={1}
                                        borderStyle="single"
                                        borderColor={THEME.colors.border}
                                    >
                                        {srv.error && (
                                            <Box marginBottom={1}>
                                                <Text color={THEME.colors.error}>
                                                    Error: {srv.error}
                                                </Text>
                                            </Box>
                                        )}

                                        {srv.config?.autoApprove &&
                                            srv.config.autoApprove.length > 0 && (
                                                <Box marginBottom={1}>
                                                    <Text color={THEME.colors.muted}>
                                                        Auto-approved tools:{' '}
                                                        <Text color={THEME.colors.brand}>
                                                            {srv.config.autoApprove.join(', ')}
                                                        </Text>
                                                    </Text>
                                                </Box>
                                            )}

                                        {srv.tools && srv.tools.length > 0 ? (
                                            <Box flexDirection="column">
                                                <Text bold color={THEME.colors.muted}>
                                                    Available Tools:
                                                </Text>
                                                {srv.tools.map((t: any) => (
                                                    <Box
                                                        key={t.name}
                                                        flexDirection="column"
                                                        marginLeft={1}
                                                    >
                                                        <Text color={THEME.colors.text}>
                                                            •{' '}
                                                            <Text bold color={THEME.colors.brand}>
                                                                {t.name}
                                                            </Text>
                                                            {t.description
                                                                ? `: ${t.description}`
                                                                : ''}
                                                        </Text>
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
                    { key: 'd/enter', label: 'Toggle Disable' },
                    { key: 'r', label: 'Reload' },
                    { key: 'esc', label: 'Back' },
                ]}
            />
        </Box>
    )
}
