import { Box, Text, useInput } from 'ink'
import SelectInput from 'ink-select-input'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'
import { CustomIndicator } from './menu-items'

export interface ToolPermissionMenuProps {
    toolCall?: any
    questions?: Array<{
        question: string
        options: string[]
    }>
    onComplete: (result: any) => void
}

function PermissionItemComponent({
    label,
    value,
    isSelected,
}: {
    label: string
    value?: string
    isSelected?: boolean
}) {
    let color: string = THEME.colors.text
    if (
        value === 'approve' ||
        value?.toLowerCase().includes('approve') ||
        value?.toLowerCase().includes('yes')
    ) {
        color = THEME.colors.success
    } else if (
        value === 'reject' ||
        value?.toLowerCase().includes('reject') ||
        value?.toLowerCase().includes('deny') ||
        value?.toLowerCase().includes('no')
    ) {
        color = THEME.colors.error
    }

    return (
        <Text color={color} bold={isSelected}>
            {label}
        </Text>
    )
}

export function ToolPermissionMenu({ toolCall, questions, onComplete }: ToolPermissionMenuProps) {
    let toolSummary = ''
    if (toolCall) {
        if (toolCall.name === 'run_command') {
            toolSummary = `run_command: ${toolCall.input?.CommandLine || ''}`
        } else if (
            toolCall.input?.TargetFile ||
            toolCall.input?.AbsolutePath ||
            toolCall.input?.filePath ||
            toolCall.input?.path
        ) {
            const target =
                toolCall.input?.TargetFile ||
                toolCall.input?.AbsolutePath ||
                toolCall.input?.filePath ||
                toolCall.input?.path
            toolSummary = `${toolCall.name}: ${target}`
        } else {
            toolSummary = `${toolCall.name}`
        }
    }

    const currentQ = questions?.[0]
    const title = toolSummary
        ? `Tool Permission Required:`
        : currentQ?.question || 'Tool Permission Required:'

    const items = toolCall
        ? [
              { label: '✓ [y] Approve', value: 'approve' },
              { label: '✗ [n] Reject', value: 'reject' },
          ]
        : currentQ?.options.map((opt) => ({ label: opt, value: opt })) || [
              { label: '✓ [y] Approve', value: 'approve' },
              { label: '✗ [n] Reject', value: 'reject' },
          ]

    const handleSelect = (item: { label: string; value: string }) => {
        if (toolCall) {
            if (item.value === 'approve') {
                onComplete({ block: false })
            } else {
                onComplete({ block: true, error: 'User denied permission' })
            }
        } else {
            onComplete(item.value)
        }
    }

    useInput((input, key) => {
        const lower = (input || '').toLowerCase()
        if (lower === 'y') {
            if (toolCall) {
                onComplete({ block: false })
            } else {
                onComplete('approve')
            }
        } else if (lower === 'n' || key.escape) {
            if (toolCall) {
                onComplete({ block: true, error: 'User denied permission' })
            } else {
                onComplete('reject')
            }
        }
    })

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1} flexDirection="column" gap={0}>
                <Text color={THEME.colors.text} bold>
                    {title}
                </Text>
                {toolSummary && (
                    <Box
                        borderStyle="round"
                        borderColor={THEME.colors.border}
                        paddingX={1}
                        marginTop={1}
                        marginBottom={1}
                    >
                        <Text color={THEME.colors.brand}>{toolSummary}</Text>
                    </Box>
                )}
            </Box>
            <SelectInput
                items={items}
                onSelect={handleSelect}
                indicatorComponent={CustomIndicator}
                itemComponent={PermissionItemComponent}
            />
            <MenuFooter
                items={[
                    { key: 'y', label: 'Approve' },
                    { key: 'n', label: 'Reject' },
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select' },
                ]}
            />
        </Box>
    )
}
