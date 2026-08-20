import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export function SettingsMainMenu(props: any) {
    const {
        settingsNonWorkspace,
        settingsToolPermission,
        settingsThinkingLevel,
        settingsSteeringMode,
        settingsFollowUpMode,
        settingsPathGuard = true,
        settingsScope,
        hasBothAuth,
        settingsAuthPriority,
        handleSettingsMainSelect,
    } = props
    const mainItems = [
        {
            label: `PathGuard Protection     [${settingsPathGuard !== false ? 'on' : 'off'}]`,
            value: 'pathGuard',
        },
        {
            label: `Non-Workspace Access     [${settingsNonWorkspace ? 'on' : 'off'}]`,
            value: 'nonWorkspaceAccess',
        },
        {
            label: `Tool Permission          [${settingsToolPermission}]`,
            value: 'toolPermission',
        },
        {
            label: `Thinking Level           [${settingsThinkingLevel}]`,
            value: 'thinkingLevel',
        },
        {
            label: `Steering Mode            [${settingsSteeringMode}]`,
            value: 'steeringMode',
        },
        {
            label: `Follow-Up Mode           [${settingsFollowUpMode}]`,
            value: 'followUpMode',
        },
        {
            label: `MCP Servers              [Configure]`,
            value: 'mcpServers',
        },
    ]

    if (settingsScope) {
        mainItems.splice(2, 0, {
            label: `Monorepo Scope           [${settingsScope}]`,
            value: 'scope',
        })
    }

    if (hasBothAuth) {
        mainItems.unshift({
            label: `Preferred Auth Method    [${settingsAuthPriority === 'december' ? 'December Cloud' : 'BYOK'}]`,
            value: 'authPriority',
        })
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Settings</Text>
            </Box>
            <SelectInput
                items={mainItems}
                onSelect={handleSettingsMainSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Toggle' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
