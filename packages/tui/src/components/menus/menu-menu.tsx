import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export interface MenuMenuProps {
    handleAuthMenuSelect?: (item: { label: string; value: string }) => void
    setAuthMode?: (mode: string) => void
    detectedSubscriptions?: Record<string, any> | string[]
}

export function MenuMenu(props: MenuMenuProps) {
    const { handleAuthMenuSelect, setAuthMode } = props
    const [selectedIndex, setSelectedIndex] = useState(0)

    const items = [
        {
            label: 'Bring Your Own Key',
            value: 'byok',
        },
        {
            label: 'Use AI Subscription',
            value: 'subscriptions',
        },
        {
            label: 'Login via December',
            value: 'december',
        },
    ]

    useInput((input, key) => {
        if (key.upArrow || input === 'k') {
            if (selectedIndex > 0) {
                setSelectedIndex(selectedIndex - 1)
            }
            return
        }

        if (key.downArrow || input === 'j') {
            if (selectedIndex < items.length - 1) {
                setSelectedIndex(selectedIndex + 1)
            }
            return
        }

        if (key.return) {
            if (handleAuthMenuSelect && items[selectedIndex]) {
                handleAuthMenuSelect(items[selectedIndex])
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

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select authentication method:</Text>
            </Box>

            {items.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                    <Box key={item.value} paddingLeft={0}>
                        <Box marginRight={1}>
                            <Text color={THEME.colors.brand}>
                                {isSelected ? THEME.glyphs.selector : ' '}
                            </Text>
                        </Box>
                        <Text color={isSelected ? THEME.colors.brand : THEME.colors.text}>
                            {item.label}
                        </Text>
                    </Box>
                )
            })}

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
