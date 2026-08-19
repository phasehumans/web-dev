import { Box, Text } from 'ink'
import React from 'react'

import { THEME } from '../../theme'
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
    expandCommands?: boolean
}

function CollapsibleThought({
    content,
    isStreaming,
    forceExpanded,
}: {
    content: string
    isStreaming?: boolean
    forceExpanded?: boolean
}) {
    const expanded = forceExpanded ?? true

    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    const tokenCount = Math.max(1, Math.round(words * 1.33))

    if (isStreaming) {
        return (
            <Box flexDirection="column" marginY={0}>
                <Text color={THEME.colors.muted}>{content}</Text>
            </Box>
        )
    }

    return (
        <Box flexDirection="column" marginY={0}>
            <Text color={THEME.colors.muted} italic>
                Thoughts ({tokenCount} tokens{expanded ? ' · ctrl+o to collapse' : ''})
            </Text>
            {expanded && (
                <Box paddingLeft={1} paddingTop={0.5}>
                    <Text color={THEME.colors.muted}>{content}</Text>
                </Box>
            )}
        </Box>
    )
}

function StyledCommand({ command, truncate = true }: { command: string; truncate?: boolean }) {
    const match = command.match(/^([A-Za-z_]+)\(([\s\S]*)\)$/)
    if (match) {
        let args = (match[2] || '').replace(/\r?\n/g, ' ')
        if (truncate && args.length > 80) {
            args = args.substring(0, 80) + '...'
        }
        const cmdColor = THEME.colors.warning

        return (
            <Text>
                <Text color={cmdColor}>{`${THEME.glyphs.status} `}</Text>
                <Text color={cmdColor} bold>
                    {match[1]}
                </Text>
                <Text color={THEME.colors.muted}>({args})</Text>
            </Text>
        )
    }
    let displayCmd = command.replace(/\r?\n/g, ' ')
    if (truncate && displayCmd.length > 80) {
        displayCmd = displayCmd.substring(0, 80) + '...'
    }
    return <Text color={THEME.colors.text}>{displayCmd}</Text>
}

function CollapsibleCommandOutput({
    command,
    output,
    forceExpanded,
}: {
    command: string
    output?: string
    forceExpanded?: boolean
}) {
    const isExpanded = forceExpanded ?? true

    const lines = output ? output.trim().split(/\r?\n/) : []
    const MAX_VISIBLE_LINES = 20
    const visibleLines = isExpanded ? lines.slice(0, MAX_VISIBLE_LINES) : []
    const isTruncated = isExpanded && lines.length > MAX_VISIBLE_LINES

    return (
        <Box flexDirection="column" marginY={0}>
            <Box alignItems="center" gap={1}>
                <StyledCommand command={command} />
                {lines.length > 0 && (
                    <Text color={THEME.colors.muted}>
                        ({isExpanded ? 'ctrl+o to collapse' : 'ctrl+o to expand'})
                    </Text>
                )}
            </Box>
            {isExpanded && lines.length > 0 && (
                <Box flexDirection="column" marginTop={0} paddingX={1}>
                    {visibleLines.map((line, lidx) => {
                        let color: string = THEME.colors.text
                        let bgColor: string | undefined = undefined

                        if (line.startsWith('+')) {
                            color = THEME.colors.success
                            bgColor = '#122f1e'
                        } else if (line.startsWith('-')) {
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
                            <Box key={lidx} backgroundColor={bgColor} flexDirection="row">
                                <Text color={color} wrap="truncate-end">
                                    {line}
                                </Text>
                            </Box>
                        )
                    })}
                    {isTruncated && (
                        <Box paddingTop={0}>
                            <Text color={THEME.colors.muted}>
                                ... ({lines.length - MAX_VISIBLE_LINES} more lines)
                            </Text>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}

export const BotMessage = React.memo(function BotMessage({ blocks, usage, expandCommands }: Props) {
    return (
        <Box
            flexDirection="column"
            paddingX={THEME.padding.paddingX}
            paddingY={0}
            gap={0}
            marginTop={0}
        >
            {blocks.map((block, idx) => {
                let prevBlock: MessageBlock | null = null
                for (let i = idx - 1; i >= 0; i--) {
                    const b = blocks[i]
                    if (!b) continue
                    if (b.type === 'text' && (!b.content || b.content.trim() === '')) continue
                    prevBlock = b
                    break
                }
                const needsTopMargin = Boolean(
                    prevBlock &&
                    (prevBlock.type === 'command' ||
                        prevBlock.type === 'thinking' ||
                        prevBlock.type === 'compaction')
                )

                switch (block.type) {
                    case 'text': {
                        if (!block.content || block.content.trim() === '') return null
                        const isThinking =
                            block.content === 'Thinking...' ||
                            block.content === 'Searching...' ||
                            block.content === 'Reading...' ||
                            block.content === 'Planning...' ||
                            block.content === 'Coding...' ||
                            block.content === 'Executing...' ||
                            block.content === 'Testing...' ||
                            block.content === 'Verifying...' ||
                            block.content === 'Refining...' ||
                            block.content === 'Finalizing...' ||
                            block.content === 'Working...' ||
                            block.content === 'Preparing...' ||
                            block.content === 'Compacting...' ||
                            block.content === 'Generating...'
                        if (isThinking) {
                            if (idx !== blocks.length - 1) return null
                            return (
                                <Box key={idx} flexDirection="column">
                                    {needsTopMargin && <Text> </Text>}
                                    <Box gap={1} alignItems="center">
                                        <Spinner />
                                        <Text color={THEME.colors.muted}>{block.content}</Text>
                                    </Box>
                                </Box>
                            )
                        }

                        if (block.color) {
                            return (
                                <Box key={idx} flexDirection="column">
                                    {needsTopMargin && <Text> </Text>}
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
                                {needsTopMargin && <Text> </Text>}
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
                                                forceExpanded={expandCommands}
                                            />
                                        )
                                    }
                                    if (part.trim() === '') return null
                                    const hasLeadingNewline =
                                        part.startsWith('\n') ||
                                        (pidx === 0 && block.content.startsWith('\n'))
                                    return (
                                        <Box key={pidx} flexDirection="column">
                                            {hasLeadingNewline && <Text> </Text>}
                                            <SmoothMarkdown text={part.trim()} isRunning={true} />
                                        </Box>
                                    )
                                })}
                            </Box>
                        )
                    }
                    case 'error': {
                        return (
                            <Box key={idx} flexDirection="column">
                                {needsTopMargin && <Text> </Text>}
                                <Text color={THEME.colors.error}>{block.error}</Text>
                            </Box>
                        )
                    }
                    case 'interrupt': {
                        return (
                            <Box key={idx} flexDirection="row" paddingY={1}>
                                <Text color={THEME.colors.muted}>
                                    Interrupted · What should December do instead?
                                </Text>
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
                                forceExpanded={expandCommands}
                            />
                        )
                    }
                    case 'compaction': {
                        return (
                            <Box key={idx} flexDirection="column" paddingY={1}>
                                <Box flexDirection="row" gap={1} alignItems="center">
                                    <Text color={THEME.colors.warning} italic>
                                        Context Compacted
                                    </Text>
                                </Box>
                                <Box paddingLeft={1} paddingTop={1}>
                                    <Text color={THEME.colors.muted}>
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

                        let parsedInput: any = {}
                        try {
                            parsedInput = JSON.parse(block.toolInput || '{}')
                        } catch {
                            // ignore parse errors
                        }

                        if (!isRunning) {
                            const isNoOutputTool =
                                block.toolName === 'read_file' ||
                                block.toolName === 'view_file' ||
                                block.toolName === 'ask_permission' ||
                                block.toolName === 'list_permissions'

                            if (isNoOutputTool) {
                                return (
                                    <Box key={idx} flexDirection="column">
                                        <Box alignItems="center" gap={1}>
                                            <StyledCommand command={block.command} />
                                        </Box>
                                    </Box>
                                )
                            }

                            let displayOutput = block.output
                            if (
                                block.toolName === 'replace_file_content' ||
                                block.toolName === 'multi_replace_file_content' ||
                                block.toolName === 'edit_file' ||
                                block.toolName === 'edit_diff' ||
                                block.toolName === 'write_file' ||
                                block.toolName === 'write_to_file'
                            ) {
                                const targetContent =
                                    parsedInput.targetContent ?? parsedInput.TargetContent
                                const replacementContent =
                                    parsedInput.replacementContent ?? parsedInput.ReplacementContent

                                if (
                                    targetContent !== undefined ||
                                    replacementContent !== undefined
                                ) {
                                    const target = (targetContent || '')
                                        .split(/\r?\n/)
                                        .map((l: string) => (l.startsWith('-') ? l : `-${l}`))
                                        .join('\n')
                                    const replacement = (replacementContent || '')
                                        .split(/\r?\n/)
                                        .map((l: string) => (l.startsWith('+') ? l : `+${l}`))
                                        .join('\n')
                                    displayOutput = [target, replacement].filter(Boolean).join('\n')
                                } else if (
                                    parsedInput.ReplacementChunks &&
                                    Array.isArray(parsedInput.ReplacementChunks)
                                ) {
                                    displayOutput = parsedInput.ReplacementChunks.map(
                                        (chunk: any) => {
                                            const tContent =
                                                chunk.targetContent ?? chunk.TargetContent ?? ''
                                            const rContent =
                                                chunk.replacementContent ??
                                                chunk.ReplacementContent ??
                                                ''
                                            const t = tContent
                                                .split(/\r?\n/)
                                                .map((l: string) =>
                                                    l.startsWith('-') ? l : `-${l}`
                                                )
                                                .join('\n')
                                            const r = rContent
                                                .split(/\r?\n/)
                                                .map((l: string) =>
                                                    l.startsWith('+') ? l : `+${l}`
                                                )
                                                .join('\n')
                                            return `${t}\n${r}`
                                        }
                                    ).join('\n')
                                } else if (parsedInput.diff) {
                                    displayOutput = parsedInput.diff
                                } else if (
                                    block.toolName === 'write_file' ||
                                    block.toolName === 'write_to_file'
                                ) {
                                    const code =
                                        parsedInput.codeContent ??
                                        parsedInput.CodeContent ??
                                        parsedInput.content ??
                                        parsedInput.code ??
                                        ''
                                    displayOutput = (code || '')
                                        .split(/\r?\n/)
                                        .map((l: string) => (l.startsWith('+') ? l : `+${l}`))
                                        .join('\n')
                                }
                            }

                            return (
                                <CollapsibleCommandOutput
                                    key={idx}
                                    command={block.command}
                                    output={displayOutput}
                                    forceExpanded={expandCommands}
                                />
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
                                    <Text color={THEME.colors.muted}>{statusLabel}</Text>
                                </Box>
                                {block.output && (
                                    <Box
                                        flexDirection="column"
                                        marginLeft={0}
                                        marginTop={0.5}
                                        paddingX={1}
                                        paddingY={0.5}
                                    >
                                        {block.output
                                            .trim()
                                            .split(/\r?\n/)
                                            .slice(-2)
                                            .map((line, lidx) => (
                                                <Text
                                                    key={lidx}
                                                    color={THEME.colors.muted}
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
                                <Text
                                    color={THEME.colors.warning}
                                >{`${THEME.glyphs.status} `}</Text>
                                <Text color={THEME.colors.warning} bold>
                                    {actionLabel}
                                </Text>
                                <Text color={THEME.colors.muted}>{block.filePath}</Text>
                            </Box>
                        )
                    }
                    case 'code': {
                        return (
                            <Box key={idx} flexDirection="column" paddingLeft={2} paddingY={0.5}>
                                {block.code.split(/\r?\n/).map((line, lidx) => (
                                    <Text key={lidx} color={THEME.colors.text}>
                                        {line}
                                    </Text>
                                ))}
                            </Box>
                        )
                    }
                    case 'status': {
                        return (
                            <Box key={idx} gap={1} alignItems="center">
                                <Text
                                    color={
                                        block.success ? THEME.colors.success : THEME.colors.error
                                    }
                                >
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
})
