import { Box, Text } from 'ink'

type Props = {
    message: string
}

export function ErrorMessage({ message }: Props) {
    return (
        <Box paddingX={4} paddingY={0.5}>
            <Text color="#FCA5A5">{message}</Text>
        </Box>
    )
}
