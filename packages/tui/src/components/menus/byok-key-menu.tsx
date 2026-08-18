import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export function ByokKeyMenu(props: any) {
    const { selectedProvider, apiKey, setApiKey, handleKeySubmit } = props
    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text} bold>
                    Enter API Key for {selectedProvider}:
                </Text>
            </Box>
            <Box>
                <Text color={THEME.colors.brand} bold={false}>
                    {`${THEME.glyphs.prompt} `}
                </Text>
                <TextInput
                    focus={true}
                    value={apiKey}
                    onChange={setApiKey}
                    onSubmit={handleKeySubmit}
                />
            </Box>
            {props.authError && (
                <Box marginTop={1}>
                    <Text color={THEME.colors.error}>{props.authError}</Text>
                </Box>
            )}
            <MenuFooter
                items={[
                    { key: 'enter', label: 'Submit' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
