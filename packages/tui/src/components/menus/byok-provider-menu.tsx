import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export function ByokProviderMenu(props: any) {
    const { handleProviderSelect } = props
    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Select API Provider:</Text>
            </Box>
            <SelectInput
                items={[
                    { label: 'AgentRouter', value: 'agentrouter' },
                    { label: 'Anthropic', value: 'anthropic' },
                    { label: 'Cerebras', value: 'cerebras' },
                    { label: 'Cohere', value: 'cohere' },
                    { label: 'DeepSeek', value: 'deepseek' },
                    { label: 'Fireworks AI', value: 'fireworks' },
                    { label: 'Google', value: 'google' },
                    { label: 'Groq', value: 'groq' },
                    { label: 'Hugging Face', value: 'huggingface' },
                    { label: 'Hyperbolic', value: 'hyperbolic' },
                    { label: 'Kimi', value: 'kimi' },
                    { label: 'Mistral', value: 'mistral' },
                    { label: 'Moonshot AI', value: 'moonshot' },
                    { label: 'NVIDIA NIM', value: 'nvidia' },
                    { label: 'Ollama (Local Models)', value: 'ollama' },
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'OpenRouter', value: 'openrouter' },
                    { label: 'Perplexity AI', value: 'perplexity' },
                    { label: 'SambaNova Cloud', value: 'sambanova' },
                    { label: 'SiliconFlow', value: 'siliconflow' },
                    { label: 'Together AI', value: 'together' },
                    { label: 'xAI', value: 'xai' },
                    { label: 'ZAI', value: 'zai' },
                ]}
                onSelect={handleProviderSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={CustomItem}
            />
            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
