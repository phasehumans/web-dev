import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export interface SubscriptionItem {
    label: string
    value: string
    hint?: string
}

export const SUBSCRIPTION_MENU_ITEMS: SubscriptionItem[] = [
    {
        label: 'Anthropic (Claude)',
        value: 'claude',
    },
    {
        label: 'GitHub (Copilot)',
        value: 'copilot',
    },
    {
        label: 'Google (Gemini / Antigravity)',
        value: 'gemini',
    },
    {
        label: 'OpenAI (ChatGPT)',
        value: 'codex',
    },
]

export interface SubscriptionSelectMenuProps {
    handleProviderSelect?: (item: { label: string; value: string }) => void
    handleSubscriptionSelect?: (item: { label: string; value: string }) => void
    setAuthMode?: (mode: string) => void
    detectedSubscriptions?: Record<string, any> | string[]
    items?: SubscriptionItem[]
}

export function SubscriptionSelectMenu(props: SubscriptionSelectMenuProps) {
    const {
        handleProviderSelect,
        handleSubscriptionSelect,
        setAuthMode,
        items = SUBSCRIPTION_MENU_ITEMS,
    } = props
    const [selectedIndex, setSelectedIndex] = useState(0)

    const onSelect = handleSubscriptionSelect || handleProviderSelect

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
            if (onSelect && items[selectedIndex]) {
                onSelect(items[selectedIndex])
            }
            return
        }

        if (key.escape) {
            if (setAuthMode) {
                setAuthMode('menu')
            }
            return
        }
    })

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select AI Subscription Provider:</Text>
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
                    { key: 'enter', label: 'Connect' },
                    { key: 'esc', label: 'Back' },
                ]}
            />
        </Box>
    )
}
