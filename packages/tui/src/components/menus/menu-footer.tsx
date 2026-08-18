import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

export interface MenuFooterItem {
    key: string
    label: string
}

export interface MenuFooterProps {
    items: MenuFooterItem[]
}

export function MenuFooter({ items }: MenuFooterProps) {
    if (!items || items.length === 0) return null

    return (
        <Box paddingTop={1}>
            <Box gap={1}>
                {items.map((item, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <Text color={THEME.colors.muted}>·</Text>}
                        <Text color={THEME.colors.brand}>{item.key}</Text>
                        <Text color={THEME.colors.muted}>{item.label}</Text>
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    )
}
