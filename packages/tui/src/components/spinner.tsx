import { Text, Box } from 'ink'
import InkSpinner from 'ink-spinner'
import React from 'react'

import { THEME } from '../theme'

export function Spinner({ label }: { label?: string }) {
    return (
        <Box gap={1} alignItems="center">
            <Text color={THEME.colors.muted}>
                <InkSpinner type="dots" />
            </Text>
            {label && <Text color={THEME.colors.muted}>{label}</Text>}
        </Box>
    )
}
