import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'

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
        <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
                <Text color="white">Select Model:</Text>
            </Box>
            <SelectInput
                items={items}
                limit={10}
                onSelect={handleModelSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
            <Box paddingTop={1}>
                <Box gap={1}>
                    <Text color="#89B4F8">↑↓</Text>
                    <Text color="#AAAAAA">Navigate</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">enter</Text>
                    <Text color="#AAAAAA">Select</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        </Box>
    )
}
