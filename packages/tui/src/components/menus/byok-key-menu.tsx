import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

export function ByokKeyMenu(props: any) {
    const { selectedProvider, apiKey, setApiKey, handleKeySubmit } = props
    return (
        <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
                <Text color="white">Enter API Key for {selectedProvider}:</Text>
            </Box>
            <Box>
                <Text color="#89B4F8" bold={false}>
                    ❭{' '}
                </Text>
                <TextInput
                    focus={true}
                    value={apiKey}
                    onChange={setApiKey}
                    onSubmit={handleKeySubmit}
                    mask="*"
                />
            </Box>
            {props.authError && (
                <Box marginTop={1}>
                    <Text color="#FCA5A5">{props.authError}</Text>
                </Box>
            )}
            <Box paddingTop={1}>
                <Box gap={1}>
                    <Text color="#89B4F8">enter</Text>
                    <Text color="#AAAAAA">Submit</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        </Box>
    )
}
