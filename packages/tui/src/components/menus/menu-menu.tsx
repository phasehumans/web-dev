import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export interface MenuMenuProps {
    handleAuthMenuSelect?: (item: { label: string; value: string }) => void
    setAuthMode?: (mode: string) => void
    detectedSubscriptions?: Record<string, any> | string[]
}

export function MenuMenu(props: MenuMenuProps) {
    const { handleAuthMenuSelect, setAuthMode, detectedSubscriptions } = props

    let detectedCount = 0
    if (detectedSubscriptions) {
        if (Array.isArray(detectedSubscriptions)) {
            detectedCount = detectedSubscriptions.length
        } else if (typeof detectedSubscriptions === 'object') {
            detectedCount = Object.keys(detectedSubscriptions).length
        }
    }

    const subBadge = detectedCount > 0 ? ` (${detectedCount} detected locally ✔)` : ''

    const items = [
        {
            label: `⚡ Connect AI Subscription${subBadge}`,
            value: 'subscriptions',
        },
        {
            label: '🔑 Bring Your Own API Key (BYOK & Ollama)',
            value: 'byok',
        },
        {
            label: '☁️ Login via December (Cloud Wallet & Sync)',
            value: 'december',
        },
    ]

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select authentication method:</Text>
            </Box>
            <SelectInput
                items={items}
                onSelect={(item) => {
                    if (handleAuthMenuSelect) {
                        handleAuthMenuSelect(item)
                    }
                }}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
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
