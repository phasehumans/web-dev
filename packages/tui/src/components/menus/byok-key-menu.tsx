import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import React from 'react'

import { THEME } from '../../theme'
import { Spinner } from '../spinner'

import { MenuFooter } from './menu-footer'

export const PROVIDER_NAMES: Record<string, string> = {
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    google: 'Google',
    groq: 'Groq',
    huggingface: 'Hugging Face',
    kimi: 'Kimi',
    mistral: 'Mistral',
    moonshoot: 'Moonshoot AI',
    ollama: 'Ollama',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    xAI: 'xAI',
    zai: 'ZAI',
}

export function formatProviderName(provider?: string): string {
    if (!provider) return 'Provider'
    return PROVIDER_NAMES[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function ByokKeyMenu(props: any) {
    const { selectedProvider, apiKey, setApiKey, handleKeySubmit, isStreaming, authError } = props
    const formattedProvider = formatProviderName(selectedProvider)

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text} bold>
                    Enter API Key for {formattedProvider}:
                </Text>
            </Box>
            <Box>
                <Text color={THEME.colors.brand} bold={false}>
                    {`${THEME.glyphs.prompt} `}
                </Text>
                <TextInput
                    focus={!isStreaming}
                    value={apiKey}
                    onChange={setApiKey}
                    onSubmit={handleKeySubmit}
                />
            </Box>
            {isStreaming ? (
                <Box marginTop={1}>
                    <Spinner label={`Verifying and saving API key for ${formattedProvider}...`} />
                </Box>
            ) : (
                <>
                    {authError && (
                        <Box marginTop={1}>
                            <Text color={THEME.colors.error}>{authError}</Text>
                        </Box>
                    )}
                    <MenuFooter
                        items={[
                            { key: 'enter', label: 'Submit' },
                            { key: 'esc', label: 'Cancel' },
                        ]}
                    />
                </>
            )}
        </Box>
    )
}
