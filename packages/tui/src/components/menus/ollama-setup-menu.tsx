import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export interface LocalProviderInfo {
    name: string
    defaultUrl: string
    installInstruction: string
    startInstruction: string
    startCommand: string
    pullInstruction: string
    recommendedModel: string
    recommendationNote: string
}

export const LOCAL_PROVIDERS: Record<string, LocalProviderInfo> = {
    ollama: {
        name: 'Ollama',
        defaultUrl: 'http://localhost:11434',
        installInstruction:
            '1. Install Ollama: https://ollama.com/download (or `curl -fsSL https://ollama.com/install.sh | sh`)',
        startInstruction: '2. Start daemon in your terminal:',
        startCommand: 'ollama serve',
        pullInstruction: '3. Pull a tool-compatible model:',
        recommendedModel: 'ollama pull qwen2.5-coder:7b',
        recommendationNote: '(Recommended for 8GB+ RAM. For 32GB+ RAM: `ollama pull llama3.3:70b`)',
    },
    lmstudio: {
        name: 'LM Studio',
        defaultUrl: 'http://localhost:1234',
        installInstruction: '1. Install LM Studio: https://lmstudio.ai/',
        startInstruction: '2. Start local server in LM Studio:',
        startCommand: 'Developer / Local Server tab -> Click "Start Server" (Port 1234)',
        pullInstruction: '3. Search & load a tool-compatible model:',
        recommendedModel: 'qwen2.5-coder-7b-instruct',
        recommendationNote:
            '(Ensure tool-calling / function-calling is enabled in server settings)',
    },
    llamacpp: {
        name: 'llama.cpp',
        defaultUrl: 'http://localhost:8080',
        installInstruction: '1. Install llama.cpp: `brew install llama.cpp` or build from source',
        startInstruction: '2. Start server in your terminal:',
        startCommand:
            'llama-server -m ./models/qwen2.5-coder-7b-instruct.gguf --port 8080 -ngl 99 -c 32768',
        pullInstruction: '3. Recommended tool-compatible model:',
        recommendedModel: 'qwen2.5-coder-7b-instruct.gguf',
        recommendationNote: '(Ensure GGUF model supports chat template & tool calling)',
    },
}

export interface OllamaStatus {
    running: boolean
    models: string[]
    compatibleModels: string[]
    baseUrl?: string
    provider?: string
    error?: string
}

export interface OllamaSetupMenuProps {
    provider?: string
    status?: OllamaStatus
    onRetry?: (customUrl?: string) => void
    onCancel: () => void
    onProceed?: (model?: string) => void
}

export function OllamaSetupMenu({
    provider: propProvider,
    status,
    onCancel,
    onProceed,
}: OllamaSetupMenuProps) {
    const providerKey = (propProvider || status?.provider || 'ollama').toLowerCase()
    const info = LOCAL_PROVIDERS[providerKey] || LOCAL_PROVIDERS.ollama

    const isRunning = status?.running ?? false
    const compatibleModels = status?.compatibleModels ?? []
    const hasCompatibleModel = compatibleModels.length > 0
    const baseUrl = status?.baseUrl || info.defaultUrl

    useInput((_input, key) => {
        if (key.escape) {
            onCancel()
        }
    })

    const handleSelect = (item: { value: string }) => {
        if (item.value.startsWith('model:')) {
            const modelName = item.value.slice('model:'.length)
            if (onProceed) {
                onProceed(modelName)
            }
        }
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.brand}>
                    {info.name} Local Provider Diagnostics & Setup
                </Text>
            </Box>

            {/* Server Status */}
            <Box flexDirection="column" marginBottom={1}>
                <Text color={THEME.colors.text}>
                    {info.name} Server:{' '}
                    <Text color={isRunning ? THEME.colors.success : THEME.colors.error}>
                        {isRunning ? `Running (${baseUrl})` : `Not detected at ${baseUrl}`}
                    </Text>
                </Text>
                {isRunning && (
                    <Text color={THEME.colors.text}>
                        Tool-Compatible Models:{' '}
                        <Text
                            color={hasCompatibleModel ? THEME.colors.success : THEME.colors.warning}
                        >
                            {hasCompatibleModel
                                ? compatibleModels.join(', ')
                                : 'None found (Agent requires function calling)'}
                        </Text>
                    </Text>
                )}
            </Box>

            {/* Step-by-Step Guidance */}
            {(!isRunning || !hasCompatibleModel) && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text color={THEME.colors.brand}>Setup Instructions:</Text>
                    {!isRunning ? (
                        <>
                            <Text color={THEME.colors.text}>{info.installInstruction}</Text>
                            <Text color={THEME.colors.text}>{info.startInstruction}</Text>
                            <Box paddingLeft={2}>
                                <Text color={THEME.colors.brand}>{info.startCommand}</Text>
                            </Box>
                        </>
                    ) : null}
                    {!hasCompatibleModel ? (
                        <>
                            <Text color={THEME.colors.text}>
                                {isRunning ? '1. ' : '3. '}
                                {info.pullInstruction.replace(/^\d+\.\s*/, '')}
                            </Text>
                            <Box paddingLeft={2} flexDirection="column">
                                <Text color={THEME.colors.brand}>{info.recommendedModel}</Text>
                                <Text color={THEME.colors.muted}>{info.recommendationNote}</Text>
                            </Box>
                        </>
                    ) : null}
                </Box>
            )}

            {/* Model Selection if Running with Compatible Models */}
            {hasCompatibleModel && (
                <Box marginTop={1} flexDirection="column">
                    <SelectInput
                        items={compatibleModels.map((m) => ({
                            label: `Use Model: ${m}`,
                            value: `model:${m}`,
                        }))}
                        onSelect={handleSelect}
                        indicatorComponent={CustomIndicator}
                        itemComponent={CustomItem}
                    />
                </Box>
            )}

            <MenuFooter
                items={
                    hasCompatibleModel
                        ? [
                              { key: '↑/↓', label: 'Navigate' },
                              { key: 'enter', label: 'Select' },
                              { key: 'esc', label: 'Back' },
                          ]
                        : [{ key: 'esc', label: 'Back' }]
                }
            />
        </Box>
    )
}

export const LocalSetupMenu = OllamaSetupMenu
