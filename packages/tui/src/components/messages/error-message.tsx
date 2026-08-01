import { Box, Text } from 'ink'

type Props = {
    message: string
    hasTopMargin?: boolean
}

export function ErrorMessage({ message, hasTopMargin = false }: Props) {
    return (
        <Box paddingX={4} paddingY={0} flexDirection="column">
            {hasTopMargin && <Text> </Text>}
            <Text color="#FCA5A5">{message.trim()}</Text>
        </Box>
    )
}
