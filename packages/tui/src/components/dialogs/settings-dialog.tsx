import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React, { useState } from 'react'

import { useKeyboardLayer } from '../../providers/keyboard-layer'

type Props = {
    close: () => void
    toast: any
}

export function SettingsDialog({ close, toast }: Props) {
    const { isTopLayer } = useKeyboardLayer()
    const [menuState, setMenuState] = useState<'main' | 'agent' | 'ui' | 'keys' | 'prompt'>('main')

    // local dummy settings states
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [density, setDensity] = useState<'compact' | 'spacious'>('compact')
    const [defaultModel, setDefaultModel] = useState('gemini-3.6-flash')
    const [maxTokens, setMaxTokens] = useState(4096)
    const [geminiKey, setGeminiKey] = useState('configured')
    const [openrouterKey, setOpenrouterKey] = useState('not-configured')

    useInput((_input, key) => {
        if (!isTopLayer('dialog')) return
        if (key.escape) {
            if (menuState !== 'main') {
                setMenuState('main')
            } else {
                close()
            }
        }
    })

    const handleMainSelect = (item: any) => {
        setMenuState(item.value)
    }

    const handleAgentSelect = (item: any) => {
        if (item.value === 'back') {
            setMenuState('main')
            return
        }
        if (item.value.startsWith('model:')) {
            const model = item.value.split(':')[1]
            setDefaultModel(model)
            toast.show({ variant: 'success', message: `Default model updated to ${model}` })
        } else if (item.value.startsWith('tokens:')) {
            const tokens = parseInt(item.value.split(':')[1], 10)
            setMaxTokens(tokens)
            toast.show({ variant: 'success', message: `Max tokens set to ${tokens}` })
        }
    }

    const handleUISelect = (item: any) => {
        if (item.value === 'back') {
            setMenuState('main')
            return
        }
        if (item.value === 'sound') {
            setSoundEnabled((prev) => {
                const next = !prev
                toast.show({ message: `Notification sounds ${next ? 'enabled' : 'disabled'}` })
                return next
            })
        } else if (item.value === 'density') {
            setDensity((prev) => {
                const next = prev === 'compact' ? 'spacious' : 'compact'
                toast.show({ message: `Layout density set to ${next}` })
                return next
            })
        }
    }

    const handleKeysSelect = (item: any) => {
        if (item.value === 'back') {
            setMenuState('main')
            return
        }
        if (item.value === 'gemini') {
            setGeminiKey((prev) => (prev === 'configured' ? 'not-configured' : 'configured'))
            toast.show({ message: 'Gemini API key toggled' })
        } else if (item.value === 'openrouter') {
            setOpenrouterKey((prev) => (prev === 'configured' ? 'not-configured' : 'configured'))
            toast.show({ message: 'OpenRouter API key toggled' })
        }
    }

    // custom items renderer to show checkmarks/badges
    const CustomIndicator = ({ isSelected }: { isSelected?: boolean }) => (
        <Text color="#89B4F8">{isSelected ? '❭ ' : '  '}</Text>
    )

    const CustomItem = ({ label }: { label?: string }) => <Text color="white">{label}</Text>

    if (menuState === 'main') {
        const mainItems = [
            { label: '⚙️  Agent Configuration', value: 'agent' },
            { label: '🎨  Interface Settings', value: 'ui' },
            { label: '🔑  API Key Management', value: 'keys' },
            { label: '📝  View System Prompt', value: 'prompt' },
        ]

        return (
            <Box flexDirection="column" gap={1}>
                <Box borderStyle="single" borderColor="#444444" flexDirection="column" padding={1}>
                    <Text bold color="#89B4F8">
                        Select Settings Category:
                    </Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={mainItems}
                            onSelect={handleMainSelect}
                            indicatorComponent={CustomIndicator}
                            itemComponent={CustomItem}
                        />
                    </Box>
                </Box>
                <Text color="gray">↑/↓ Navigate · enter Select · esc Close</Text>
            </Box>
        )
    }

    if (menuState === 'agent') {
        const agentItems = [
            {
                label: `Default Model: [${defaultModel}]`,
                value:
                    defaultModel === 'gemini-3.6-flash'
                        ? 'model:gemini-3-pro-preview'
                        : 'model:gemini-3.6-flash',
            },
            {
                label: `Max Tokens: [${maxTokens}]`,
                value: maxTokens === 4096 ? 'tokens:8192' : 'tokens:4096',
            },
            { label: '◀  Back to Categories', value: 'back' },
        ]

        return (
            <Box flexDirection="column" gap={1}>
                <Box borderStyle="single" borderColor="#444444" flexDirection="column" padding={1}>
                    <Text bold color="#89B4F8">
                        ⚙️ Agent Configuration:
                    </Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={agentItems}
                            onSelect={handleAgentSelect}
                            indicatorComponent={CustomIndicator}
                            itemComponent={CustomItem}
                        />
                    </Box>
                </Box>
                <Text color="gray">↑/↓ Navigate · enter Toggle/Select · esc Back</Text>
            </Box>
        )
    }

    if (menuState === 'ui') {
        const uiItems = [
            {
                label: `Notification Sounds: [${soundEnabled ? 'Enabled' : 'Disabled'}]`,
                value: 'sound',
            },
            {
                label: `Layout Density: [${density === 'compact' ? 'Compact' : 'Spacious'}]`,
                value: 'density',
            },
            { label: '◀  Back to Categories', value: 'back' },
        ]

        return (
            <Box flexDirection="column" gap={1}>
                <Box borderStyle="single" borderColor="#444444" flexDirection="column" padding={1}>
                    <Text bold color="#89B4F8">
                        🎨 Interface Settings:
                    </Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={uiItems}
                            onSelect={handleUISelect}
                            indicatorComponent={CustomIndicator}
                            itemComponent={CustomItem}
                        />
                    </Box>
                </Box>
                <Text color="gray">↑/↓ Navigate · enter Toggle · esc Back</Text>
            </Box>
        )
    }

    if (menuState === 'keys') {
        const keyItems = [
            {
                label: `Gemini API Key: [${geminiKey === 'configured' ? '✓ Configured' : '✗ Not Set'}]`,
                value: 'gemini',
            },
            {
                label: `OpenRouter API Key: [${openrouterKey === 'configured' ? '✓ Configured' : '✗ Not Set'}]`,
                value: 'openrouter',
            },
            { label: '◀  Back to Categories', value: 'back' },
        ]

        return (
            <Box flexDirection="column" gap={1}>
                <Box borderStyle="single" borderColor="#444444" flexDirection="column" padding={1}>
                    <Text bold color="#89B4F8">
                        🔑 API Key Management:
                    </Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={keyItems}
                            onSelect={handleKeysSelect}
                            indicatorComponent={CustomIndicator}
                            itemComponent={CustomItem}
                        />
                    </Box>
                </Box>
                <Text color="gray">↑/↓ Navigate · enter Toggle · esc Back</Text>
            </Box>
        )
    }

    if (menuState === 'prompt') {
        return (
            <Box flexDirection="column" gap={1}>
                <Box borderStyle="single" borderColor="#444444" flexDirection="column" padding={1}>
                    <Text bold color="#89B4F8">
                        📝 December System Prompt:
                    </Text>
                    <Box marginTop={1} flexDirection="column">
                        <Text color="#AAAAAA">
                            "You are December, an autonomous software engineer. You have access to
                            tools. When executing code, please use JSON schemas for tool inputs.
                            Before using a tool, you MUST enclose your thought process inside
                            thought tags."
                        </Text>
                    </Box>
                </Box>
                <Text color="gray">esc Back to Categories</Text>
            </Box>
        )
    }

    return null
}
