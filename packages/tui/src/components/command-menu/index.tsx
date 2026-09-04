import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'
import { MenuFooter } from '../menus/menu-footer'

import { getFilteredCommands } from './filter-commands'

const WINDOW_SIZE = 5
const CMD_COL_WIDTH = 24

type CommandMenuProps = {
    query: string
    selectedIndex: number
    windowStart: number
    totalFiltered: number
    onSelect: (index: number) => void
    onExecute: (index: number) => void
}

export function CommandMenu({ query, selectedIndex, windowStart }: CommandMenuProps) {
    const filtered = getFilteredCommands(query)

    if (filtered.length === 0) {
        return (
            <Box paddingLeft={2} paddingY={1}>
                <Text color={THEME.colors.muted}>No matching commands</Text>
            </Box>
        )
    }

    const windowEnd = Math.min(windowStart + WINDOW_SIZE, filtered.length)
    const visibleItems = filtered.slice(windowStart, windowEnd)
    const itemsAbove = windowStart
    const itemsBelow = filtered.length - windowEnd

    return (
        <Box flexDirection="column">
            {/* ↑ n more */}
            {itemsAbove > 0 && (
                <Box paddingLeft={2}>
                    <Text color={THEME.colors.muted}>↑ {itemsAbove} more</Text>
                </Box>
            )}

            {/* command rows */}
            {visibleItems.map((cmd, relIdx) => {
                const absIdx = windowStart + relIdx
                const isSelected = absIdx === selectedIndex
                return (
                    <Box key={cmd.value} paddingLeft={2}>
                        <Text color={isSelected ? THEME.colors.brand : THEME.colors.muted}>
                            {isSelected ? `${THEME.glyphs.selector} ` : '  '}
                        </Text>
                        <Box width={CMD_COL_WIDTH}>
                            <Text
                                color={isSelected ? THEME.colors.brand : THEME.colors.muted}
                                bold={false}
                            >
                                /{cmd.name}
                            </Text>
                        </Box>
                        <Text color={THEME.colors.muted} wrap="truncate-end">
                            {cmd.description}
                        </Text>
                    </Box>
                )
            })}

            {/* ↓ n more */}
            {itemsBelow > 0 && (
                <Box paddingLeft={2}>
                    <Text color={THEME.colors.muted}>↓ {itemsBelow} more</Text>
                </Box>
            )}

            {/* footer */}
            <Box paddingLeft={2} paddingBottom={1}>
                <MenuFooter
                    items={[
                        { key: '↑/↓', label: 'Navigate' },
                        { key: 'enter', label: 'Select' },
                        { key: 'tab', label: 'Complete' },
                        { key: 'esc', label: 'Cancel' },
                    ]}
                />
            </Box>
        </Box>
    )
}
