import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'

import { CustomIndicator, CustomItem } from './menu-items'

export function SettingsMainMenu(props: any) {
    const {
        settingsNonWorkspace,
        settingsShowTasks,
        settingsToolPermission,
        settingsThinkingLevel,
        settingsSteeringMode,
        settingsFollowUpMode,
        hasBothAuth,
        settingsAuthPriority,
        handleSettingsMainSelect,
    } = props
    const mainItems = [
        {
            label: `Non-Workspace Access     [${settingsNonWorkspace ? 'on' : 'off'}]`,
            value: 'nonWorkspaceAccess',
        },
        {
            label: `Show Active Tasks        [${settingsShowTasks ? 'on' : 'off'}]`,
            value: 'showActiveTasks',
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
    ]

    if (hasBothAuth) {
        mainItems.unshift({
            label: `Preferred Auth Method    [${settingsAuthPriority === 'december' ? 'December Cloud' : 'BYOK'}]`,
            value: 'authPriority',
        })
    }

    return (
        <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
                <Text bold color="white">
                    Settings
                </Text>
            </Box>
            <SelectInput
                items={mainItems}
                onSelect={handleSettingsMainSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
            <Box paddingTop={1}>
                <Box gap={1}>
                    <Text color="#89B4F8">↑↓</Text>
                    <Text color="#AAAAAA">Navigate</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">enter</Text>
                    <Text color="#AAAAAA">Toggle</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        </Box>
    )
}
