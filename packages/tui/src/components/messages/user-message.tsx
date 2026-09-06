import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

type Props = {
    message: string
}

export const UserMessage = React.memo(function UserMessage({ message }: Props) {
    let displayMessage = message
    if (displayMessage.startsWith('[Skill Invocation: /')) {
        const match = displayMessage.match(/^\[Skill Invocation: (\/[^\]]+)\]/)
        if (match) {
            displayMessage = match[1]
        }
    }

    return (
        <Box
            paddingX={THEME.padding.paddingX}
            paddingY={0}
            marginTop={1}
            marginBottom={1}
            flexDirection="row"
        >
            <Box marginRight={1}>
                <Text color={THEME.colors.brand}>{THEME.glyphs.prompt}</Text>
            </Box>
            <Box flexShrink={1}>
                <Text color={THEME.colors.brand}>{displayMessage}</Text>
            </Box>
        </Box>
    )
})
