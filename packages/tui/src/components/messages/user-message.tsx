import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

type Props = {
    message: string
}

export const UserMessage = React.memo(function UserMessage({ message }: Props) {
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
                <Text color={THEME.colors.brand}>{message}</Text>
            </Box>
        </Box>
    )
})
