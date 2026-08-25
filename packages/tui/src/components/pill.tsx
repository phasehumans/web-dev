import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../theme'

export type PillProps = {
    label: string
    color?: string
    backgroundColor?: string
    dimColor?: boolean
}

export function Pill({
    label,
    color = THEME.colors.text,
    backgroundColor = THEME.colors.border,
    dimColor,
}: PillProps) {
    return (
        <Box backgroundColor={backgroundColor} paddingX={1} marginX={1}>
            <Text color={color} dimColor={dimColor}>
                {label}
            </Text>
        </Box>
    )
}
