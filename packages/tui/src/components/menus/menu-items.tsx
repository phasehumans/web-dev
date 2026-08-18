import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

export const CustomIndicator = ({ isSelected }: { isSelected?: boolean }) => (
    <Box marginRight={1}>
        <Text color={THEME.colors.brand}>{isSelected ? THEME.glyphs.selector : ' '}</Text>
    </Box>
)

export const CustomItem = ({ label, isSelected }: { label: string; isSelected?: boolean }) => (
    <Text color={isSelected ? THEME.colors.brand : THEME.colors.text}>{label}</Text>
)

export * from './menu-footer'
