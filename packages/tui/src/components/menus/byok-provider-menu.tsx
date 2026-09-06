import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

const WINDOW_SIZE = 7

export const PROVIDER_MENU_ITEMS = [
    { label: 'AgentRouter', value: 'agentrouter' },
    { label: 'Anthropic', value: 'anthropic' },
    { label: 'Arcee AI', value: 'arcee' },
    { label: 'Cerebras', value: 'cerebras' },
    { label: 'Cohere', value: 'cohere' },
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'Fireworks AI', value: 'fireworks' },
    { label: 'Google AI Studio', value: 'google' },
    { label: 'Groq', value: 'groq' },
    { label: 'Hugging Face', value: 'huggingface' },
    { label: 'Hyperbolic', value: 'hyperbolic' },
    { label: 'Kimi', value: 'kimi' },
    { label: 'LM Studio', value: 'lmstudio' },
    { label: 'llama.cpp', value: 'llamacpp' },
    { label: 'MiniMax', value: 'minimax' },
    { label: 'Mistral AI', value: 'mistral' },
    { label: 'NVIDIA NIM', value: 'nvidia' },
    { label: 'Ollama', value: 'ollama' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'OpenRouter', value: 'openrouter' },
    { label: 'Perplexity AI', value: 'perplexity' },
    { label: 'Qwen (DashScope)', value: 'dashscope' },
    { label: 'SambaNova Cloud', value: 'sambanova' },
    { label: 'SiliconFlow', value: 'siliconflow' },
    { label: 'Together AI', value: 'together' },
    { label: 'xAI', value: 'xai' },
    { label: 'ZAI', value: 'zai' },
]

export interface ByokProviderMenuProps {
    handleProviderSelect?: (item: { label: string; value: string }) => void
    handleByokSelect?: (item: { label: string; value: string }) => void
    setAuthMode?: (mode: string) => void
    items?: { label: string; value: string }[]
}

export function ByokProviderMenu(props: ByokProviderMenuProps) {
    const {
        handleProviderSelect,
        handleByokSelect,
        setAuthMode,
        items = PROVIDER_MENU_ITEMS,
    } = props
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [windowStart, setWindowStart] = useState(0)

    const onSelect = handleByokSelect || handleProviderSelect

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

    const windowEnd = Math.min(windowStart + WINDOW_SIZE, items.length)
    const visibleItems = items.slice(windowStart, windowEnd)
    const itemsAbove = windowStart
    const itemsBelow = items.length - windowEnd

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select API Provider (BYOK):</Text>
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
                        <Text color={isSelected ? THEME.colors.brand : THEME.colors.text}>
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
                    { key: 'esc', label: 'Back' },
                ]}
            />
        </Box>
    )
}
