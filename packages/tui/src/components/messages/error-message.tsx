import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

type Props = {
    message: string
    hasTopMargin?: boolean
}

export function ErrorMessage({ message, hasTopMargin = false }: Props) {
    return (
        <Box paddingX={THEME.padding.paddingX} paddingY={0} flexDirection="column">
            {hasTopMargin && <Text> </Text>}
            <Text color={THEME.colors.error}>{message.trim()}</Text>
        </Box>
    )
}
