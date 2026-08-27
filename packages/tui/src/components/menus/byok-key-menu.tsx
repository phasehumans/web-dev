import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import React from 'react'

import { THEME } from '../../theme'
import { Spinner } from '../spinner'

import { MenuFooter } from './menu-footer'

export const PROVIDER_NAMES: Record<string, string> = {
    anthropic: 'Anthropic',
    cerebras: 'Cerebras',
    cohere: 'Cohere',
    deepseek: 'DeepSeek',
    fireworks: 'Fireworks AI',
    google: 'Google',
    groq: 'Groq',
    huggingface: 'Hugging Face',
    hyperbolic: 'Hyperbolic',
    kimi: 'Kimi',
    mistral: 'Mistral',
    moonshot: 'Moonshot AI',
    moonshoot: 'Moonshoot AI',
    nvidia: 'NVIDIA NIM',
    ollama: 'Ollama',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    perplexity: 'Perplexity AI',
    sambanova: 'SambaNova Cloud',
    siliconflow: 'SiliconFlow',
    together: 'Together AI',
    xAI: 'xAI',
    xai: 'xAI',
    zai: 'ZAI',
}

export const PROVIDER_KEY_URLS: Record<string, string> = {
    anthropic: 'https://console.anthropic.com/settings/keys',
    cerebras: 'https://cloud.cerebras.ai/',
    cohere: 'https://dashboard.cohere.com/api-keys',
    deepseek: 'https://platform.deepseek.com/api_keys',
    fireworks: 'https://app.fireworks.ai/api-keys',
    google: 'https://aistudio.google.com/app/apikey',
    gemini: 'https://aistudio.google.com/app/apikey',
    groq: 'https://console.groq.com/keys',
    huggingface: 'https://huggingface.co/settings/tokens',
    hyperbolic: 'https://app.hyperbolic.ai/settings',
    kimi: 'https://platform.moonshot.ai/console/api-keys',
    mistral: 'https://console.mistral.ai/api-keys/',
    moonshot: 'https://platform.moonshot.ai/console/api-keys',
    moonshoot: 'https://platform.moonshot.ai/console/api-keys',
    nvidia: 'https://build.nvidia.com/',
    ollama: 'https://ollama.com/download',
    openai: 'https://platform.openai.com/api-keys',
    openrouter: 'https://openrouter.ai/settings/keys',
    perplexity: 'https://www.perplexity.ai/settings/api',
    sambanova: 'https://cloud.sambanova.ai/apis',
    siliconflow: 'https://cloud.siliconflow.cn/account/ak',
    siliconcloud: 'https://cloud.siliconflow.cn/account/ak',
    together: 'https://api.together.ai/settings/api-keys',
    togetherai: 'https://api.together.ai/settings/api-keys',
    xAI: 'https://console.x.ai/',
    xai: 'https://console.x.ai/',
    zai: 'https://open.bigmodel.cn/usercenter/apikeys',
}

export function formatProviderName(provider?: string): string {
    if (!provider) return 'Provider'
    return PROVIDER_NAMES[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function ByokKeyMenu(props: any) {
    const { selectedProvider, apiKey, setApiKey, handleKeySubmit, isStreaming, authError } = props
    const formattedProvider = formatProviderName(selectedProvider)
    const keyUrl = selectedProvider ? PROVIDER_KEY_URLS[selectedProvider] : undefined

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box flexDirection="column" marginBottom={1}>
                <Text color={THEME.colors.text}>Enter API Key for {formattedProvider}:</Text>
                {keyUrl && (
                    <Text italic color={THEME.colors.dim}>
                        {"Don't have an API key? Get one at "}
                        <Text color={THEME.colors.brand}>{keyUrl}</Text>
                    </Text>
                )}
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
