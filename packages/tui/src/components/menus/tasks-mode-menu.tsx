import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export interface TaskItem {
    id: string
    command: string
    status: 'running' | 'completed' | 'failed' | 'killed' | string
    output?: string
}

export interface TasksModeMenuProps {
    tasksData: TaskItem[]
    taskViewingId: string | null
    taskScrollOffset: number
    taskSelectedIndex: number
}

export function TasksModeMenu(props: TasksModeMenuProps) {
    const { tasksData = [], taskViewingId, taskScrollOffset = 0, taskSelectedIndex = 0 } = props

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return THEME.colors.warning
            case 'completed':
                return THEME.colors.success
            case 'failed':
            case 'killed':
                return THEME.colors.error
            default:
                return THEME.colors.text
        }
    }

    if (taskViewingId) {
        const task = tasksData.find((t) => t.id === taskViewingId)
        if (task) {
            const rawOutput = task.output || ''
            const outputLines = rawOutput.split(/\r?\n/)
            const visibleLines = outputLines.slice(taskScrollOffset, taskScrollOffset + 15)

            return (
                <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
                    <Box marginBottom={1} justifyContent="space-between">
                        <Text color={THEME.colors.text}>Task: {task.id}</Text>
                        <Text color={getStatusColor(task.status)}>
                            [{task.status.toUpperCase()}]
                        </Text>
                    </Box>
                    <Box marginBottom={1}>
                        <Text color={THEME.colors.muted}>Cmd: {task.command}</Text>
                    </Box>
                    <Box
                        borderColor={THEME.colors.border}
                        borderStyle="round"
                        flexDirection="column"
                        minHeight={8}
                        paddingX={1}
                    >
                        {visibleLines.length === 0 ||
                        (visibleLines.length === 1 && visibleLines[0] === '') ? (
                            <Text color={THEME.colors.muted}>[No output recorded yet]</Text>
                        ) : (
                            visibleLines.map((line, idx) => (
                                <Text key={idx} color={THEME.colors.text}>
                                    {line}
                                </Text>
                            ))
                        )}
                    </Box>
                    <Box marginTop={1} justifyContent="space-between">
                        <Text color={THEME.colors.muted}>
                            Showing lines{' '}
                            {outputLines.length > 0
                                ? Math.min(outputLines.length, taskScrollOffset + 1)
                                : 0}
                            -{Math.min(outputLines.length, taskScrollOffset + visibleLines.length)}{' '}
                            of {outputLines.length}
                        </Text>
                    </Box>
                    <MenuFooter
                        items={[
                            { key: '↑/↓', label: 'Scroll Line' },
                            { key: '←/→', label: 'Page' },
                            { key: 'esc', label: 'Cancel' },
                        ]}
                    />
                </Box>
            )
        }
    }

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1}>
                <Text color={THEME.colors.text}>Tasks</Text>
            </Box>
            {tasksData.length === 0 ? (
                <Box paddingLeft={2}>
                    <Text color={THEME.colors.muted}>No background tasks.</Text>
                </Box>
            ) : (
                tasksData.map((task, idx) => {
                    const isSelected = idx === taskSelectedIndex
                    const truncatedCommand =
                        task.command.length > 50 ? task.command.slice(0, 47) + '...' : task.command
                    return (
                        <Box key={task.id} flexDirection="row">
                            <Box width={2}>
                                <Text color={isSelected ? THEME.colors.brand : THEME.colors.muted}>
                                    {isSelected ? `${THEME.glyphs.selector} ` : '  '}
                                </Text>
                            </Box>
                            <Box width={25}>
                                <Text
                                    color={isSelected ? THEME.colors.text : THEME.colors.muted}
                                    wrap="truncate"
                                >
                                    {task.id}
                                </Text>
                            </Box>
                            <Box width={15}>
                                <Text color={getStatusColor(task.status)}>
                                    [{task.status.toUpperCase()}]
                                </Text>
                            </Box>
                            <Box>
                                <Text color={isSelected ? THEME.colors.text : THEME.colors.muted}>
                                    {truncatedCommand}
                                </Text>
                            </Box>
                        </Box>
                    )
                })
            )}
            <MenuFooter
                items={[
                    { key: '↑/↓', label: 'Navigate' },
                    { key: '←/→', label: 'Page' },
                    { key: 'enter', label: 'View output' },
                    { key: 'k', label: 'Kill Task' },
                    { key: 'esc', label: 'Cancel' },
                ]}
            />
        </Box>
    )
}
