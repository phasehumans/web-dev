import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export interface ModelSelectMenuProps {
    handleModelSelect: (item: { label: string; value: string }) => void
    selectedProvider: string
    openRouterModels?: { label: string; value: string }[]
    ollamaModels?: { label: string; value: string }[]
    getProviderModels?: (provider: string) => { label: string; value: string }[]
}

export function ModelSelectMenu({
    handleModelSelect,
    selectedProvider,
    openRouterModels,
    ollamaModels,
    getProviderModels,
}: ModelSelectMenuProps) {
    const items =
        selectedProvider === 'openrouter'
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

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text} bold>
                    Select Model:
                </Text>
            </Box>
            <SelectInput
                items={items}
                limit={10}
                onSelect={handleModelSelect}
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
