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
    if (value === 'approve' || value === 'always' || value === 'git-tracked') {
        color = THEME.colors.success
    } else if (value === 'reject' || value === 'deny') {
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

    const rawDiff = toolCall?.diff || toolCall?.input?.diff || ''
    const diffLines = rawDiff ? rawDiff.split('\n') : []
    const MAX_VISIBLE_DIFF_LINES = 15
    const visibleDiffLines = diffLines.slice(0, MAX_VISIBLE_DIFF_LINES)
    const isDiffTruncated = diffLines.length > MAX_VISIBLE_DIFF_LINES

    const currentQ = questions?.[0]
    const title = toolSummary
        ? `Tool Permission Required:`
        : currentQ?.question || 'Tool Permission Required:'

    const items = toolCall
        ? [
              { label: '[y] Approve', value: 'approve' },
              { label: '[a] Always allow in session', value: 'always' },
              { label: '[g] Only git-tracked files', value: 'git-tracked' },
              { label: '[d] Deny', value: 'deny' },
          ]
        : currentQ?.options.map((opt) => ({ label: opt, value: opt })) || [
              { label: '[y] Approve', value: 'approve' },
              { label: '[a] Always allow in session', value: 'always' },
              { label: '[g] Only git-tracked files', value: 'git-tracked' },
              { label: '[d] Deny', value: 'deny' },
          ]

    const handleSelect = (item: { label: string; value: string }) => {
        if (toolCall) {
            if (item.value === 'approve') {
                onComplete({ block: false })
            } else if (item.value === 'always') {
                onComplete({ block: false, allowAlways: true })
            } else if (item.value === 'git-tracked') {
                onComplete({ block: false, gitTrackedOnly: true })
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
        } else if (lower === 'a') {
            if (toolCall) {
                onComplete({ block: false, allowAlways: true })
            } else {
                onComplete('always')
            }
        } else if (lower === 'g') {
            if (toolCall) {
                onComplete({ block: false, gitTrackedOnly: true })
            } else {
                onComplete('git-tracked')
            }
        } else if (lower === 'd' || lower === 'n' || key.escape) {
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
                        flexDirection="column"
                        borderStyle="round"
                        borderColor={THEME.colors.border}
                        paddingX={1}
                        marginTop={1}
                        marginBottom={1}
                    >
                        <Text color={THEME.colors.brand} bold>
                            {toolSummary}
                        </Text>
                        {visibleDiffLines.length > 0 && (
                            <Box flexDirection="column" marginTop={1}>
                                {visibleDiffLines.map((line, lidx) => {
                                    let color: string = THEME.colors.text
                                    let bgColor: string | undefined = undefined

                                    if (line.startsWith('+') && !line.startsWith('+++')) {
                                        color = THEME.colors.success
                                        bgColor = '#122f1e'
                                    } else if (line.startsWith('-') && !line.startsWith('---')) {
                                        color = THEME.colors.error
                                        bgColor = '#3f1316'
                                    } else if (
                                        line.startsWith('@@') ||
                                        line.startsWith('diff --git') ||
                                        line.startsWith('---') ||
                                        line.startsWith('+++')
                                    ) {
                                        color = THEME.colors.muted
                                    }

                                    return (
                                        <Box
                                            key={lidx}
                                            backgroundColor={bgColor}
                                            flexDirection="row"
                                        >
                                            <Text color={color} wrap="truncate-end">
                                                {line}
                                            </Text>
                                        </Box>
                                    )
                                })}
                                {isDiffTruncated && (
                                    <Box paddingTop={0}>
                                        <Text color={THEME.colors.muted}>
                                            ... ({diffLines.length - MAX_VISIBLE_DIFF_LINES} more
                                            lines)
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        )}
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
                    { key: 'a', label: 'Always' },
                    { key: 'g', label: 'Git-tracked only' },
                    { key: 'd', label: 'Deny' },
                    { key: '↑/↓', label: 'Navigate' },
                    { key: 'enter', label: 'Select' },
                ]}
            />
        </Box>
    )
}
