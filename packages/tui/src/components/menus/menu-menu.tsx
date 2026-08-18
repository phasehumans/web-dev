import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export function MenuMenu(props: any) {
    const { handleAuthMenuSelect } = props
    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text} bold>
                    Select authentication method:
                </Text>
            </Box>
            <SelectInput
                items={[
                    { label: 'Bring Your Own Key (BYOK)', value: 'byok' },
                    { label: 'Login via December (Cloud Wallet)', value: 'december' },
                ]}
                onSelect={handleAuthMenuSelect}
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
