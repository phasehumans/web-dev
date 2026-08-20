import { Box, Text } from 'ink'
import SelectInput from 'ink-select-input'
import TextInput from 'ink-text-input'
import React, { useState } from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator, CustomItem } from './menu-items'

export interface OllamaStatus {
    running: boolean
    models: string[]
    compatibleModels: string[]
    baseUrl?: string
    error?: string
}

export interface OllamaSetupMenuProps {
    status?: OllamaStatus
    onRetry: (customUrl?: string) => void
    onCancel: () => void
    onProceed?: (model?: string) => void
}

export function OllamaSetupMenu({ status, onRetry, onCancel, onProceed }: OllamaSetupMenuProps) {
    const [isEditingUrl, setIsEditingUrl] = useState(false)
    const [customUrl, setCustomUrl] = useState(status?.baseUrl || 'http://localhost:11434')

    const isRunning = status?.running ?? false
    const compatibleModels = status?.compatibleModels ?? []
    const hasCompatibleModel = compatibleModels.length > 0
    const baseUrl = status?.baseUrl || 'http://localhost:11434'

    const handleSelect = (item: { value: string }) => {
        if (item.value === 'retry') {
            onRetry(customUrl)
        } else if (item.value === 'change_url') {
            setIsEditingUrl(true)
        } else if (item.value === 'cancel') {
            onCancel()
        } else if (item.value.startsWith('model:')) {
            const modelName = item.value.slice('model:'.length)
            if (onProceed) {
                onProceed(modelName)
            }
        }
    }

    const handleUrlSubmit = (value: string) => {
        setIsEditingUrl(false)
        onRetry(value.trim() || 'http://localhost:11434')
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.brand}>Ollama Local Provider Diagnostics & Setup</Text>
            </Box>

            {/* Server Status */}
            <Box flexDirection="column" marginBottom={1}>
                <Text color={THEME.colors.text}>
                    Ollama Server:{' '}
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
                            <Text color={THEME.colors.text}>
                                1. Install Ollama: https://ollama.com/download (or `curl -fsSL
                                https://ollama.com/install.sh | sh`)
                            </Text>
                            <Text color={THEME.colors.text}>
                                2. Start daemon in your terminal:{' '}
                                <Text color={THEME.colors.success}>ollama serve</Text>
                            </Text>
                        </>
                    ) : null}
                    {!hasCompatibleModel ? (
                        <>
                            <Text color={THEME.colors.text}>
                                {isRunning ? '1' : '3'}. Pull a tool-compatible model:
                            </Text>
                            <Box paddingLeft={2} flexDirection="column">
                                <Text color={THEME.colors.success}>
                                    ollama pull qwen2.5-coder:7b
                                </Text>
                                <Text color={THEME.colors.muted}>
                                    (Recommended for 8GB+ RAM. For 32GB+ RAM: `ollama pull
                                    llama3.3:70b`)
                                </Text>
                            </Box>
                        </>
                    ) : null}
                </Box>
            )}

            {/* Custom URL Input Mode */}
            {isEditingUrl ? (
                <Box flexDirection="column" marginTop={1}>
                    <Text color={THEME.colors.text}>Enter Ollama Base URL:</Text>
                    <Box>
                        <Text color={THEME.colors.brand}>{`${THEME.glyphs.prompt} `}</Text>
                        <TextInput
                            focus={true}
                            value={customUrl}
                            onChange={setCustomUrl}
                            onSubmit={handleUrlSubmit}
                        />
                    </Box>
                </Box>
            ) : (
                <SelectInput
                    items={[
                        ...(hasCompatibleModel
                            ? compatibleModels.map((m) => ({
                                  label: `Use Model: ${m}`,
                                  value: `model:${m}`,
                              }))
                            : []),
                        { label: 'Retry Connection', value: 'retry' },
                        { label: 'Change Base URL', value: 'change_url' },
                        { label: 'Back to Providers', value: 'cancel' },
                    ]}
                    onSelect={handleSelect}
                    indicatorComponent={CustomIndicator}
                    itemComponent={CustomItem}
                />
            )}

            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select / Submit' },
                    { key: 'esc', label: 'Back' },
                ]}
            />
        </Box>
    )
}
