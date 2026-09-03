import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

const WINDOW_SIZE = 7

export interface ModelSelectMenuProps {
    handleModelSelect: (item: { label: string; value: string }) => void
    setAuthMode?: (mode: string) => void
    selectedProvider: string
    openRouterModels?: { label: string; value: string }[]
    ollamaModels?: { label: string; value: string }[]
    getProviderModels?: (provider: string) => { label: string; value: string }[]
    items?: { label: string; value: string }[]
}

export function ModelSelectMenu(props: ModelSelectMenuProps) {
    const {
        handleModelSelect,
        setAuthMode,
        selectedProvider,
        openRouterModels,
        ollamaModels,
        getProviderModels,
        items: customItems,
    } = props

    const items =
        customItems && customItems.length > 0
            ? customItems
            : selectedProvider === 'openrouter'
              ? openRouterModels && openRouterModels.length > 0
                  ? openRouterModels
                  : typeof getProviderModels === 'function'
                    ? getProviderModels('openrouter')
                    : [{ label: 'Loading models...', value: 'loading' }]
              : selectedProvider === 'ollama'
                ? ollamaModels && ollamaModels.length > 0
                    ? ollamaModels
                    : typeof getProviderModels === 'function'
                      ? getProviderModels('ollama')
                      : [{ label: 'Loading models...', value: 'loading' }]
                : typeof getProviderModels === 'function'
                  ? getProviderModels(selectedProvider)
                  : []

    const [selectedIndex, setSelectedIndex] = useState(0)
    const [windowStart, setWindowStart] = useState(0)

    useInput((input, key) => {
        if (key.upArrow || input === 'k') {
            if (selectedIndex > 0) {
                const next = selectedIndex - 1
                setSelectedIndex(next)
                if (next < windowStart) {
                    setWindowStart(next)
                }
            }
            return
        }

        if (key.downArrow || input === 'j') {
            if (selectedIndex < items.length - 1) {
                const next = selectedIndex + 1
                setSelectedIndex(next)
                if (next >= windowStart + WINDOW_SIZE) {
                    setWindowStart(next - WINDOW_SIZE + 1)
                }
            }
            return
        }

        if (key.return) {
            if (handleModelSelect && items[selectedIndex]) {
                handleModelSelect(items[selectedIndex])
            }
            return
        }

        if (key.escape || input === '\u001B') {
            if (setAuthMode) {
                setAuthMode('none')
            }
            return
        }
    })

    const windowEnd = Math.min(windowStart + WINDOW_SIZE, items.length)
    const visibleItems = items.slice(windowStart, windowEnd)
    const itemsAbove = windowStart
    const itemsBelow = items.length - windowEnd

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select Model:</Text>
            </Box>

            {/* ↑ n more */}
            {itemsAbove > 0 && (
                <Box paddingLeft={2}>
                    <Text color={THEME.colors.muted}>↑ {itemsAbove} more</Text>
                </Box>
            )}

            {/* visible items */}
            {visibleItems.map((item, relIdx) => {
                const absIdx = windowStart + relIdx
                const isSelected = absIdx === selectedIndex
                return (
                    <Box key={item.value} paddingLeft={0}>
                        <Box marginRight={1}>
                            <Text color={THEME.colors.brand}>
                                {isSelected ? THEME.glyphs.selector : ' '}
                            </Text>
                        </Box>
                        <Text
                            color={isSelected ? THEME.colors.brand : THEME.colors.text}
                            bold={isSelected}
                        >
                            {item.label}
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

            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
