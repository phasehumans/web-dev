import { Box, Text } from 'ink'
import React from 'react'

type Props = {
    message: string
}

export const UserMessage = React.memo(function UserMessage({ message }: Props) {
    return (
        <Box
            paddingLeft={2}
            paddingRight={4}
            paddingY={0}
            marginTop={1}
            marginBottom={1}
            flexDirection="row"
        >
            <Box marginRight={1}>
                <Text color="#89B4F8">❭</Text>
            </Box>
            <Box flexShrink={1}>
                <Text color="#89B4F8">{message}</Text>
            </Box>
        </Box>
    )
})
