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
        label: 'GitHub Copilot',
        value: 'copilot',
        hint: 'Use GitHub Copilot subscription via CLI / OAuth',
    },
    {
        label: 'Claude Code (Anthropic)',
        value: 'claude',
        hint: 'Use Claude Pro / Team subscription via Claude Code CLI',
    },
    {
        label: 'ChatGPT Plus / Team / Pro (OpenAI)',
        value: 'codex',
        hint: 'Use OpenAI ChatGPT subscription via Codex auth',
    },
    {
        label: 'Google Gemini / Antigravity',
        value: 'gemini',
        hint: 'Use Gemini Advanced / Antigravity via Google OAuth / ADC',
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
        detectedSubscriptions,
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

    const isDetected = (value: string): boolean => {
        if (!detectedSubscriptions) return false
        if (Array.isArray(detectedSubscriptions)) {
            return detectedSubscriptions.includes(value)
        }
        return !!detectedSubscriptions[value]
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select AI Subscription Provider:</Text>
            </Box>

            {items.map((item, idx) => {
                const isSelected = idx === selectedIndex
                const detected = isDetected(item.value)
                return (
                    <Box
                        key={item.value}
                        flexDirection="column"
                        marginBottom={idx < items.length - 1 ? 1 : 0}
                    >
                        <Box>
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
                            {detected && <Text color="#6EE7B7"> [✔ Detected locally]</Text>}
                            {!detected && (
                                <Text color={THEME.colors.muted}> [OAuth / Connect]</Text>
                            )}
                        </Box>
                        {isSelected && item.hint && (
                            <Box paddingLeft={2}>
                                <Text color={THEME.colors.muted}>{item.hint}</Text>
                            </Box>
                        )}
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
