import { getModelContextWindow } from '@december/providers'
import { decomposeContext } from '@december/shared'
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
    const maxTokens = getModelContextWindow(activeModelId) || 1000000

    const decomp = decomposeContext({
        agent,
        model: activeModelId,
        maxTokens,
    })

    const basePromptTokens = decomp.basePrompt.tokens
    const rulesTokens = decomp.rules.tokens
    const skillsTokens = decomp.skills.tokens
    const builtInToolsTokens = decomp.builtInTools.tokens
    const dynamicMcpToolsTokens = decomp.dynamicMcpTools.tokens
    const conversationHistoryTokens = decomp.conversationHistory.totalTokens
    const totalTokens = decomp.totalTokens
    const freeTokens = decomp.freeTokens
    const cacheableStaticPrefixTokens = decomp.cacheableStaticPrefixTokens

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

    addSquares(Math.round((basePromptTokens / maxTokens) * totalSquares), '●', THEME.colors.muted)
    addSquares(Math.round((rulesTokens / maxTokens) * totalSquares), '●', THEME.colors.warning)
    addSquares(Math.round((skillsTokens / maxTokens) * totalSquares), '●', THEME.colors.error)
    addSquares(Math.round((builtInToolsTokens / maxTokens) * totalSquares), '●', THEME.colors.brand)
    addSquares(
        Math.round((dynamicMcpToolsTokens / maxTokens) * totalSquares),
        '●',
        THEME.colors.dim
    )
    addSquares(
        Math.round((conversationHistoryTokens / maxTokens) * totalSquares),
        '●',
        THEME.colors.success
    )

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
                            <Text color={THEME.colors.muted}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Base System Prompt: {formatK(basePromptTokens)} tokens (
                                {pct(basePromptTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.warning}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Project Rules (AGENTS.md / rules.md): {formatK(rulesTokens)} tokens
                                ({pct(rulesTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.error}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Workspace Skills (skills.md): {formatK(skillsTokens)} tokens (
                                {pct(skillsTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.brand}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Built-in Tool Schemas: {formatK(builtInToolsTokens)} tokens (
                                {pct(builtInToolsTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.dim}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Dynamic MCP Tools: {formatK(dynamicMcpToolsTokens)} tokens (
                                {pct(dynamicMcpToolsTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.success}>●</Text>
                            <Text color={THEME.colors.muted}>
                                Conversation History: {formatK(conversationHistoryTokens)} tokens (
                                {pct(conversationHistoryTokens)}%)
                            </Text>
                        </Box>
                        <Box gap={1}>
                            <Text color={THEME.colors.border}>□</Text>
                            <Text color={THEME.colors.muted}>
                                Free space: {formatK(freeTokens)} ({pct(freeTokens)}%)
                            </Text>
                        </Box>
                    </Box>
                    <Box marginTop={1} gap={1}>
                        <Text color={THEME.colors.brand}>★</Text>
                        <Text color={THEME.colors.muted}>
                            Cacheable static prefix: {formatK(cacheableStaticPrefixTokens)} tokens (
                            {pct(cacheableStaticPrefixTokens)}%)
                        </Text>
                    </Box>
                </Box>
            </Box>
            <MenuFooter items={[{ key: 'esc', label: 'Cancel' }]} />
        </Box>
    )
}
