import { getModelContextWindow } from '@december/providers'
import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

function getModelLabel(id: string) {
    return id
}

export function ContextSelectMenu(props: any) {
    const { agent } = props
    const activeModelId = agent?.modelOptions?.model || 'gemini-3.6-flash'
    const currentModelName = getModelLabel(activeModelId)
    const maxTokens = getModelContextWindow(activeModelId)

    const userTokens = Math.round(
        (agent?.messages || [])
            .filter((m: any) => m.role === 'user')
            .reduce((acc: number, m: any) => acc + (m.content?.length || 0) / 4, 0)
    )
    const agentTokens = Math.round(
        (agent?.messages || [])
            .filter((m: any) => m.role === 'assistant')
            .reduce((acc: number, m: any) => acc + (m.content?.length || 0) / 4, 0)
    )
    const toolTokens = Math.round(
        (agent?.messages || []).reduce(
            (acc: number, m: any) =>
                acc + (m.toolCalls ? JSON.stringify(m.toolCalls).length / 4 : 0),
            0
        )
    )
    const sysTokens = Math.round((agent?.systemPrompt?.length || 0) / 4)
    const totalTokens = userTokens + agentTokens + toolTokens + sysTokens
    const freeTokens = Math.max(0, maxTokens - totalTokens)

    const pct = (n: number) => ((n / maxTokens) * 100).toFixed(1)
    const formatK = (n: number) => (n > 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString())

    const totalSquares = 200
    const squares = []
    let filled = 0
    const addSquares = (count: number, char: string, color: string) => {
        for (let i = 0; i < count && filled < totalSquares; i++) {
            squares.push(
                <Text key={filled} color={color}>
                    {char}
                </Text>
            )
            filled++
        }
    }
    addSquares(Math.round((userTokens / maxTokens) * totalSquares), '●', THEME.colors.brand)
    addSquares(Math.round((agentTokens / maxTokens) * totalSquares), '●', THEME.colors.success)
    addSquares(Math.round((toolTokens / maxTokens) * totalSquares), '●', THEME.colors.warning)
    addSquares(Math.round((sysTokens / maxTokens) * totalSquares), '●', THEME.colors.muted)

    while (filled < totalSquares) {
        squares.push(
            <Text key={filled} color={THEME.colors.border}>
                □
            </Text>
        )
        filled++
    }

    const gridRows = []
    for (let i = 0; i < totalSquares; i += 20) {
        gridRows.push(
            <Box key={i} gap={1}>
                {squares.slice(i, i + 20)}
            </Box>
        )
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text bold color={THEME.colors.text}>
                    Context
                </Text>
            </Box>
            <Box flexDirection="row" gap={4}>
                <Box flexDirection="column">{gridRows}</Box>

                <Box flexDirection="column">
                    <Box gap={1}>
                        <Text color={THEME.colors.muted}>
                            {currentModelName} · {formatK(totalTokens)}/{formatK(maxTokens)} tokens
                            ({pct(totalTokens)}%)
                        </Text>
                    </Box>
                    <Box marginTop={1}>
                        <Text color={THEME.colors.text} bold>
                            Token usage by category
                        </Text>
                    </Box>
                    <Box flexDirection="column">
                        <Box gap={1}>
                            <Text color={THEME.colors.brand}>●</Text>
                            <Text color={THEME.colors.muted}>
                                User messages: {formatK(userTokens)} tokens ({pct(userTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.success}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Agent responses: {formatK(agentTokens)} tokens ({pct(agentTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.warning}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Tool calls: {formatK(toolTokens)} tokens ({pct(toolTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.muted}>●</Text>
                            <Text color={THEME.colors.muted}>
                                System prompt: {formatK(sysTokens)} tokens ({pct(sysTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.border}>□</Text>
                            <Text color={THEME.colors.muted}>
                                Free space: {formatK(freeTokens)} ({pct(freeTokens)}%)
                            </Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
            <MenuFooter items={[{ key: 'esc', label: 'Cancel' }]} />
        </Box>
    )
}
