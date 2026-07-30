import { Box, Text } from 'ink'

type Props = {
    message: string
}

export function UserMessage({ message }: Props) {
    return (
        <Box
            paddingLeft={2}
            paddingRight={4}
            paddingY={0}
            marginTop={1}
            marginBottom={0.5}
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
}
