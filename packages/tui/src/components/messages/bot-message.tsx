import { Box, Text, useFocus, useInput } from 'ink'
import React, { useState } from 'react'

import { Spinner } from '../spinner'

import { SmoothMarkdown } from './smooth-markdown'

export type MessageBlock =
    | { type: 'text'; content: string; color?: string }
    | { type: 'thinking'; content: string; isStreaming?: boolean }
    | { type: 'compaction'; summary: string }
    | { type: 'error'; error: string }
    | { type: 'interrupt' }
    | {
          type: 'command'
          toolCallId?: string
          toolName?: string
          toolInput?: string
          command: string
          status: 'running' | 'success' | 'error'
          output?: string
      }
    | {
          type: 'file_change'
          filePath: string
          action: 'created' | 'modified' | 'deleted'
          diff?: string
      }
    | { type: 'code'; language: string; filename?: string; code: string }
    | { type: 'status'; label: string; success: boolean; hidePill?: boolean }

type Props = {
    blocks: MessageBlock[]
    usage?: { promptTokens: number; completionTokens: number }
}

function CollapsibleThought({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
    const { isFocused } = useFocus({ autoFocus: false })
    const [userExpanded, setUserExpanded] = useState<boolean | null>(null)

    useInput((input, key) => {
        if (isFocused && ((key.ctrl && input.toLowerCase() === 'o') || input === '\x0f')) {
            setUserExpanded((prev) => (prev === null ? true : !prev))
        }
    })

    const isExpanded = userExpanded !== null ? userExpanded : Boolean(isStreaming)

    const lines = content.split(/\r?\n/)
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const tokenCount = Math.max(1, Math.round(words * 1.33))

    let borderColor = '#475569'
    let headerText = ''

    if (isStreaming) {
        borderColor = '#06b6d4'
        headerText = `Thought process... (${tokenCount} tokens)`
    } else if (isExpanded) {
        borderColor = '#89b4f8'
        headerText = `Thought process (${tokenCount} tokens)`
    } else {
        borderColor = '#475569'
        headerText = `Thought process (${tokenCount} tokens)`
    }

    return (
        <Box flexDirection="row" paddingBottom={1}>
            <Box width={2} flexShrink={0}>
                <Text color={isFocused ? '#89b4f8' : borderColor}>│</Text>
            </Box>
            <Box flexDirection="column">
                <Text color={isStreaming ? 'cyan' : isFocused ? '#89b4f8' : '#64748b'} italic>
                    {headerText}
                </Text>
                <Box paddingY={0.5}>
                    <Text color="#94a3b8" dimColor>
                        {!isExpanded && lines.length > 2
                            ? lines.slice(0, 2).join('\n') + '\n...'
                            : content}
                    </Text>
                </Box>
            </Box>
        </Box>
    )
}

function StyledCommand({ command, truncate = true }: { command: string; truncate?: boolean }) {
    const match = command.match(/^([A-Za-z_]+)\((.*)\)$/)
    if (match) {
        let args = match[2] || ''
        if (truncate && args.length > 80) {
            args = args.substring(0, 80) + '...'
        }
        const cmdColor = '#fef08a' // yellow

        return (
            <Text>
                <Text color={cmdColor}>● </Text>
                <Text color={cmdColor} bold>
                    {match[1]}
                </Text>
                <Text color="#cbd5e1">({args})</Text>
            </Text>
        )
    }
    let displayCmd = command
    if (truncate && command.length > 80) {
        displayCmd = command.substring(0, 80) + '...'
    }
    return <Text color="white">{displayCmd}</Text>
}

export function BotMessage({ blocks, usage }: Props) {
    return (
        <Box flexDirection="column" paddingX={4} paddingY={0} gap={1} marginTop={1}>
            {blocks.map((block, idx) => {
                switch (block.type) {
                    case 'text': {
                        const isThinking =
                            block.content === 'Thinking...' ||
                            block.content === 'Working...' ||
                            block.content === 'Generating...'
                        if (isThinking) {
                            if (idx !== blocks.length - 1) return null
                            return (
                                <Box key={idx} gap={1} alignItems="center">
                                    <Spinner />
                                    <Text color="gray">{block.content}</Text>
                                </Box>
                            )
                        }

                        if (block.color) {
                            return (
                                <Box key={idx}>
                                    <Text color={block.color}>{block.content}</Text>
                                </Box>
                            )
                        }

                        // split by <thought> tags (case insensitive, allow attributes)
                        const parts = block.content.split(
                            /(<thought(?:>| [^>]*>)[\s\S]*?<\/thought>|<thought(?:>| [^>]*>)[\s\S]*)/i
                        )
                        return (
                            <Box key={idx} flexDirection="column">
                                {parts.map((part, pidx) => {
                                    if (/^<thought(?:>| [^>]*>)/i.test(part)) {
                                        const isClosed = /<\/thought>$/i.test(part)
                                        const isStreaming =
                                            !isClosed &&
                                            idx === blocks.length - 1 &&
                                            pidx === parts.length - 1
                                        const thoughtContent = part
                                            .replace(/^<thought(?:>| [^>]*>)/i, '')
                                            .replace(/<\/thought>$/i, '')
                                            .trim()
                                        return (
                                            <CollapsibleThought
                                                key={pidx}
                                                content={thoughtContent}
                                                isStreaming={isStreaming}
                                            />
                                        )
                                    }
                                    if (part.trim() === '') return null
                                    return (
                                        <Box key={pidx}>
                                            <SmoothMarkdown text={part.trim()} isRunning={true} />
                                        </Box>
                                    )
                                })}
                            </Box>
                        )
                    }
                    case 'error': {
                        return (
                            <Box key={idx} flexDirection="column" paddingLeft={1} marginY={1}>
                                <Text color="#FCA5A5">{block.error}</Text>
                            </Box>
                        )
                    }
                    case 'interrupt': {
                        return (
                            <Box key={idx} flexDirection="row" paddingY={1}>
                                <Text>Interrupted · What should December do instead?</Text>
                            </Box>
                        )
                    }
                    case 'thinking': {
                        const isStreaming = block.isStreaming ?? idx === blocks.length - 1
                        return (
                            <CollapsibleThought
                                key={idx}
                                content={block.content}
                                isStreaming={isStreaming}
                            />
                        )
                    }
                    case 'compaction': {
                        return (
                            <Box key={idx} flexDirection="column" paddingY={1}>
                                <Box flexDirection="row" gap={1} alignItems="center">
                                    <Text color="#fef08a" italic>
                                        Context Compacted
                                    </Text>
                                </Box>
                                <Box paddingLeft={1} paddingTop={1}>
                                    <Text color="#94a3b8" dimColor>
                                        {block.summary.replace(
                                            /^\[COMPACTED HISTORY SUMMARY\]\n/,
                                            ''
                                        )}
                                    </Text>
                                </Box>
                            </Box>
                        )
                    }
                    case 'command': {
                        const isRunning = block.status === 'running'
                        const isSuccess = block.status === 'success'

                        let parsedInput: any = {}
                        try {
                            parsedInput = JSON.parse(block.toolInput || '{}')
                        } catch {
                            // ignore parse errors
                        }

                        if (!isRunning) {
                            if (block.toolName === 'read_file' || block.toolName === 'view_file') {
                                const lines = block.output ? block.output.split(/\r?\n/).length : 0
                                return (
                                    <Box key={idx} flexDirection="column">
                                        <Box gap={1} alignItems="center">
                                            <StyledCommand command={block.command} />
                                        </Box>
                                    </Box>
                                )
                            }

                            if (
                                block.toolName === 'edit_file' ||
                                block.toolName === 'edit_diff' ||
                                block.toolName === 'write_file' ||
                                block.toolName === 'write_to_file' ||
                                block.toolName === 'multi_replace_file_content' ||
                                block.toolName === 'replace_file_content'
                            ) {
                                const path =
                                    parsedInput.path ||
                                    parsedInput.filePath ||
                                    parsedInput.TargetFile ||
                                    ''
                                const diffStr =
                                    block.toolName === 'write_file' ||
                                    block.toolName === 'write_to_file'
                                        ? parsedInput.content || parsedInput.CodeContent
                                        : parsedInput.diff
                                const isWrite =
                                    block.toolName === 'write_file' ||
                                    block.toolName === 'write_to_file'
                                const lines = diffStr
                                    ? diffStr.replace(/\r?\n$/, '').split(/\r?\n/)
                                    : []

                                return (
                                    <Box key={idx} flexDirection="column">
                                        <Box gap={1} alignItems="center">
                                            <StyledCommand command={block.command} />
                                        </Box>
                                        {isSuccess && lines.length > 0 && !isWrite && (
                                            <Box flexDirection="column" paddingLeft={0}>
                                                {lines
                                                    .slice(0, 40)
                                                    .map((line: string, lidx: number) => {
                                                        let prefixColor = '#d1d5db'
                                                        let bgColor: string | undefined = undefined
                                                        let prefix = ' '
                                                        let rest = line

                                                        if (isWrite) {
                                                            prefixColor = '#6EE7B7'
                                                            bgColor = '#122f1e'
                                                            prefix = '+'
                                                            rest = line
                                                        } else {
                                                            prefix = ' '
                                                            if (line.startsWith('+')) {
                                                                prefixColor = '#6EE7B7'
                                                                bgColor = '#122f1e'
                                                                prefix = '+'
                                                                rest = line.slice(1)
                                                            } else if (line.startsWith('-')) {
                                                                prefixColor = '#FCA5A5'
                                                                bgColor = '#3f1316'
                                                                prefix = '-'
                                                                rest = line.slice(1)
                                                            } else if (line.startsWith('@@')) {
                                                                prefixColor = '#a78bfa'
                                                                prefix = '@'
                                                                rest = line.slice(1)
                                                            } else if (line.startsWith(' ')) {
                                                                rest = line.slice(1)
                                                            }
                                                        }

                                                        return (
                                                            <Box
                                                                key={lidx}
                                                                backgroundColor={bgColor}
                                                                flexDirection="row"
                                                                paddingLeft={2}
                                                            >
                                                                <Box width={2} flexShrink={0}>
                                                                    <Text color={prefixColor}>
                                                                        {prefix}
                                                                    </Text>
                                                                </Box>
                                                                <Text
                                                                    color={
                                                                        bgColor
                                                                            ? 'white'
                                                                            : '#d1d5db'
                                                                    }
                                                                    wrap="truncate-end"
                                                                >
                                                                    {rest}
                                                                </Text>
                                                            </Box>
                                                        )
                                                    })}
                                                {lines.length > 40 && (
                                                    <Box paddingLeft={1}>
                                                        <Text color="#94a3b8">
                                                            ... ({lines.length - 40} more lines)
                                                        </Text>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                )
                            }

                            // collapsed state for other completed tools
                            return (
                                <Box key={idx} flexDirection="column" gap={1}>
                                    <Box alignItems="center" gap={1}>
                                        <StyledCommand command={block.command} />
                                    </Box>
                                </Box>
                            )
                        }

                        // expanded state for running tools
                        let statusLabel = 'Working...'
                        if (block.toolName === 'read_file' || block.toolName === 'view_file')
                            statusLabel = 'Reading...'
                        else if (
                            block.toolName === 'write_file' ||
                            block.toolName === 'write_to_file'
                        )
                            statusLabel = 'Writing...'
                        else if (block.toolName === 'run_command' || block.toolName === 'bash')
                            statusLabel = 'Executing...'
                        else if (block.toolName === 'search_web') statusLabel = 'Searching web...'
                        else if (block.toolName === 'list_dir') statusLabel = 'Listing directory...'
                        else if (
                            block.toolName === 'find_files' ||
                            block.toolName === 'grep_search'
                        )
                            statusLabel = 'Searching codebase...'
                        else if (
                            block.toolName === 'edit_file' ||
                            block.toolName === 'edit_diff' ||
                            block.toolName === 'replace_file_content' ||
                            block.toolName === 'multi_replace_file_content'
                        )
                            statusLabel = 'Modifying...'
                        else if (block.toolName === 'ask_question')
                            statusLabel = 'Asking question...'
                        else if (block.toolName === 'manage_task') statusLabel = 'Managing tasks...'
                        else if (
                            block.toolName === 'list_permissions' ||
                            block.toolName === 'ask_permission'
                        )
                            statusLabel = 'Checking permissions...'
                        else if (block.toolName === 'generate_image')
                            statusLabel = 'Generating image...'
                        else if (block.toolName === 'send_message')
                            statusLabel = 'Sending message...'
                        else if (block.toolName === 'schedule') statusLabel = 'Scheduling timer...'

                        return (
                            <Box key={idx} flexDirection="column">
                                <Box gap={1} alignItems="center">
                                    <Spinner />
                                    <Text color="cyan">{statusLabel}</Text>
                                    <StyledCommand command={block.command} truncate={false} />
                                </Box>
                                {block.output && (
                                    <Box
                                        flexDirection="column"
                                        marginLeft={0}
                                        marginTop={0.5}
                                        paddingX={1}
                                        paddingY={0.5}
                                        backgroundColor="#1e293b"
                                    >
                                        {block.output
                                            .trim()
                                            .split(/\r?\n/)
                                            .slice(-2)
                                            .map((line, lidx) => (
                                                <Text
                                                    key={lidx}
                                                    color="#94a3b8"
                                                    wrap="truncate-end"
                                                >
                                                    │ {line}
                                                </Text>
                                            ))}
                                    </Box>
                                )}
                            </Box>
                        )
                    }
                    case 'file_change': {
                        const isCreated = block.action === 'created'
                        const isDeleted = block.action === 'deleted'
                        const actionLabel = isCreated
                            ? 'CREATED'
                            : isDeleted
                              ? 'DELETED'
                              : 'MODIFIED'

                        return (
                            <Box key={idx} gap={1} alignItems="center">
                                <Text color="#fef08a">● </Text>
                                <Text color="#fef08a" bold>
                                    {actionLabel}
                                </Text>
                                <Text color="#cbd5e1">{block.filePath}</Text>
                            </Box>
                        )
                    }
                    case 'code': {
                        const borderLength = Math.max(10, 60 - (block.filename?.length ?? 0))
                        const borderLine = '─'.repeat(borderLength)
                        return (
                            <Box key={idx} flexDirection="column" paddingLeft={1}>
                                <Text color="#4A5568" wrap="truncate">
                                    {block.filename
                                        ? `┌── ${block.filename} ${borderLine}`
                                        : `┌${borderLine}`}
                                </Text>
                                <Box flexDirection="column" paddingLeft={2}>
                                    {block.code.split(/\r?\n/).map((line, lidx) => (
                                        <Text key={lidx} color="#E2E8F0">
                                            {line}
                                        </Text>
                                    ))}
                                </Box>
                                <Text color="#4A5568">└──</Text>
                            </Box>
                        )
                    }
                    case 'status': {
                        return (
                            <Box key={idx} gap={1} alignItems="center">
                                <Text color={block.success ? '#6EE7B7' : '#FCA5A5'}>
                                    {block.label}
                                </Text>
                            </Box>
                        )
                    }
                    default:
                        return null
                }
            })}
        </Box>
    )
}
