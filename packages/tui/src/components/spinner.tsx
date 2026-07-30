import { Text, Box } from 'ink'
import InkSpinner from 'ink-spinner'

export function Spinner({ label }: { label?: string }) {
    return (
        <Box gap={1} alignItems="center">
            <Text color="gray">
                <InkSpinner type="dots" />
            </Text>
            {label && <Text color="gray">{label}</Text>}
        </Box>
    )
}
