import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'

import { CustomIndicator, CustomItem } from './menu-items'

export function ByokProviderMenu(props: any) {
    const { handleProviderSelect } = props
    return (
        <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
                <Text color="white">Select API Provider:</Text>
            </Box>
            <SelectInput
                items={[
                    { label: 'Anthropic', value: 'anthropic' },
                    { label: 'DeepSeek', value: 'deepseek' },
                    { label: 'Google', value: 'google' },
                    { label: 'Groq', value: 'groq' },
                    { label: 'Hugging Face', value: 'huggingface' },
                    { label: 'Kimi', value: 'kimi' },
                    { label: 'Mistral', value: 'mistral' },
                    { label: 'Moonshoot AI', value: 'moonshoot' },
                    { label: 'Ollama (Local Models)', value: 'ollama' },
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'OpenRouter', value: 'openrouter' },
                    { label: 'xAI', value: 'xAI' },
                    { label: 'ZAI', value: 'zai' },
                ]}
                onSelect={handleProviderSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
            <Box paddingTop={1}>
                <Box gap={1}>
                    <Text color="#89B4F8">↑↓</Text>
                    <Text color="#AAAAAA">Navigate</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">enter</Text>
                    <Text color="#AAAAAA">Select</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        </Box>
    )
}
