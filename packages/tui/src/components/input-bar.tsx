import { getWorkspaceIgnores } from '@december/shared'
import fg from 'fast-glob'
import { Box, Text, useInput } from 'ink'
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'

import { useTerminalColumns } from '../hooks/use-terminal-columns'
import { useDialog, InlineDialog } from '../providers/dialog'
import { useToast } from '../providers/toast'
import { THEME } from '../theme'
import { defaultPromptHistory } from '../utils/prompt-history'

import { CommandMenu } from './command-menu'
import { useCommandMenu } from './command-menu/use-command-menu'
import { ShortcutsMenu } from './menus/shortcuts-menu'
import { TextArea } from './text-area'

import type { Command } from './command-menu/types'

type Props = {
    onSubmit: (text: string) => void
    disabled?: boolean
    placeholder?: string
    activeModel?: string
    authMethod?: 'byok' | 'december' | 'env'
    hasBothAuth?: boolean
    authUI?: React.ReactNode
    agent?: any
    resetChat?: () => void
    onUpdateSuccess?: () => Promise<void>
    planMode?: boolean
    grillMode?: boolean
    customInputMode?: boolean
    onInterrupt?: () => void
    onCopy?: () => void
    contextTokens?: number
    showExitConfirm?: boolean
    toasts?: { id: string; message: string; variant?: string }[]
    queuedPrompts?: string[]
}

const MAX_FILE_SUGGESTIONS = 5

export const InputBar = React.memo(function InputBar({
    onSubmit,
    disabled = false,
    placeholder = 'Ask December to build...',
    activeModel = 'unknown',
    authMethod,
    hasBothAuth = false,
    authUI,
    agent,
    resetChat,
    onUpdateSuccess,
    grillMode = false,
    customInputMode = false,
    onInterrupt,
    onCopy,
    contextTokens,
    showExitConfirm = false,
    toasts,
    queuedPrompts,
}: Props) {
    const [value, setValue] = useState('')
    const toast = useToast()
    const dialog = useDialog()
    const columns = useTerminalColumns()

    const [selectedFileIndex, setSelectedFileIndex] = useState(0)
    const [allWorkspaceFiles, setAllWorkspaceFiles] = useState<string[]>([])

    const activeToast =
        toasts && toasts.length > 0
            ? toasts[toasts.length - 1]
            : toast.currentToast
              ? { message: toast.currentToast.message, variant: toast.currentToast.variant }
              : null

    const handleContentChangeRef = useRef<(text: string) => void>(() => {})

    const handleAutocompleteCommand = useCallback((completedText: string) => {
        setValue(completedText)
        handleContentChangeRef.current(completedText)
    }, [])

    const {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        windowStart,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
    } = useCommandMenu({ onAutocomplete: handleAutocompleteCommand })

    handleContentChangeRef.current = handleContentChange

    const [showShortcutsMenu, setShowShortcutsMenu] = useState(false)

    // Check for @filename mention query
    const fileMatch = value.match(/@(\S*)$/)
    const showFileMenu = Boolean(fileMatch) && !showCommandMenu && !showShortcutsMenu
    const fileQuery = fileMatch ? fileMatch[1]?.toLowerCase() || '' : ''

    // Load workspace files lazily and asynchronously ONLY when user types @
    useEffect(() => {
        if (!fileMatch || allWorkspaceFiles.length > 0) return

        let isMounted = true
        try {
            const ignores = getWorkspaceIgnores()
            fg(['**/*'], {
                dot: true,
                ignore: ignores,
                onlyFiles: true,
                suppressErrors: true,
            })
                .then((files) => {
                    if (isMounted) {
                        setAllWorkspaceFiles(files)
                    }
                })
                .catch(() => {
                    // Intentionally swallowed: fallback to empty workspace files on error
                    if (isMounted) {
                        setAllWorkspaceFiles([])
                    }
                })
        } catch {
            // Intentionally swallowed: ignore file listing errors
            setAllWorkspaceFiles([])
        }

        return () => {
            isMounted = false
        }
    }, [fileMatch, allWorkspaceFiles.length])

    const matchingFiles = useMemo(() => {
        if (!showFileMenu) return []
        return allWorkspaceFiles
            .filter((f) => f.toLowerCase().includes(fileQuery))
            .slice(0, MAX_FILE_SUGGESTIONS)
    }, [showFileMenu, allWorkspaceFiles, fileQuery])

    const isCtrlW = useRef(false)
    useInput((input, key) => {
        if (showFileMenu && matchingFiles.length > 0) {
            if (key.upArrow) {
                setSelectedFileIndex((prev) => Math.max(0, prev - 1))
                return
            }
            if (key.downArrow) {
                setSelectedFileIndex((prev) => Math.min(matchingFiles.length - 1, prev + 1))
                return
            }
            if (key.tab || key.return) {
                const selectedFile = matchingFiles[selectedFileIndex]
                if (selectedFile) {
                    const nextVal = value.replace(/@\S*$/, `@${selectedFile} `)
                    setValue(nextVal)
                    handleContentChange(nextVal)
                    setSelectedFileIndex(0)
                }
                return
            }
            if (key.escape) {
                const nextVal = value.replace(/@\S*$/, '')
                setValue(nextVal)
                handleContentChange(nextVal)
                return
            }
        }

        if (key.ctrl && input === 'w') {
            isCtrlW.current = true
            setValue((prev) => {
                const match = prev.match(/(\s*\S+\s*)$/)
                const next = match ? prev.slice(0, -match[0].length) : prev
                handleContentChange(next)
                return next
            })
        }
        if ((key.backspace || key.delete) && value.length === 0 && grillMode) {
            onSubmit('/grill-me')
        }
        if (key.ctrl && input === 'c') {
            if (onInterrupt) onInterrupt()
            return
        }
        if (key.ctrl && input === 'y') {
            if (onCopy) onCopy()
            return
        }
    })

    const handleChange = useCallback(
        (newValue: string) => {
            if (disabled) return
            if (isCtrlW.current) {
                isCtrlW.current = false
                return
            }
            if (newValue === '?') {
                setShowShortcutsMenu(true)
                setValue('?')
                return
            } else if (showShortcutsMenu) {
                setShowShortcutsMenu(false)
            }
            setValue(newValue)
            handleContentChange(newValue)
            setSelectedFileIndex(0)
        },
        [disabled, handleContentChange, showShortcutsMenu]
    )

    const handleHistoryUp = useCallback(() => {
        const prev = defaultPromptHistory.getPrevious(value)
        if (prev !== value) {
            setValue(prev)
            handleContentChange(prev)
        }
    }, [value, handleContentChange])

    const handleHistoryDown = useCallback(() => {
        const next = defaultPromptHistory.getNext()
        if (next !== value) {
            setValue(next)
            handleContentChange(next)
        }
    }, [value, handleContentChange])

    const handleCommand = useCallback(
        (command: Command | undefined) => {
            if (!command) return

            const currentValue = value.trim()
            setValue('')
            handleContentChange('')

            // Forward chat & session commands and custom commands to chat component
            const forwardCommands = [
                '/grill-me',
                '/login',
                '/logout',
                '/exit',
                '/model',
                '/plan',
                '/resume',
                '/settings',
                '/context',
                '/tasks',
                '/usage',
                '/feedback',
                '/mcp',
                '/update',
                '/new',
                '/clear',
                '/fork',
                '/copy',
                '/handoff',
                '/init',
            ]

            if (forwardCommands.includes(command.value) || !command.action) {
                if (
                    currentValue.length > command.value.length &&
                    currentValue.toLowerCase().startsWith(command.value.toLowerCase())
                ) {
                    onSubmit(currentValue)
                } else {
                    onSubmit(command.value)
                }
                return
            }

            if (command.action) {
                command.action({
                    exit: () => process.exit(0),
                    toast,
                    dialog,
                    agent,
                    resetChat,
                    onUpdateSuccess,
                })
            }
        },
        [toast, dialog, agent, resetChat, onUpdateSuccess, handleContentChange, onSubmit, value]
    )

    const handleSubmit = useCallback(
        async (text: string) => {
            if (disabled) return
            if (showCommandMenu) {
                const command = resolveCommand(selectedIndex)
                handleCommand(command)
                return
            }
            if (showShortcutsMenu) {
                return
            }
            const trimmed = text.trim()
            if (trimmed.length === 0) return
            defaultPromptHistory.append(trimmed)
            defaultPromptHistory.resetCursor()
            setValue('')
            handleContentChange('')

            // Forward slash commands and shell escapes directly without @ context expansion
            if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
                onSubmit(trimmed)
                return
            }

            // Expand @ file mentions into rich context blocks
            try {
                const { resolveContextMentions } = await import('@december/shared')
                const resolved = await resolveContextMentions(trimmed)
                onSubmit(resolved.expandedPrompt)
            } catch {
                // Intentionally swallowed: fallback to unexpanded text on resolution error
                onSubmit(trimmed)
            }
        },
        [
            disabled,
            showCommandMenu,
            showShortcutsMenu,
            resolveCommand,
            selectedIndex,
            handleCommand,
            onSubmit,
            handleContentChange,
        ]
    )

    const sepWidth = Math.max(10, columns - THEME.padding.paddingX * 2)
    const sep = '─'.repeat(sepWidth)

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX} marginTop={1}>
            {/* inline dialog — shown on right above prompt when open */}
            {dialog.isOpen && dialog.currentDialog && (
                <Box justifyContent="flex-end">
                    <InlineDialog config={dialog.currentDialog} close={dialog.close} />
                </Box>
            )}
            {/* queued prompts indicator */}
            {queuedPrompts && queuedPrompts.length > 0 && (
                <Box width="100%" marginBottom={0}>
                    <Text color={THEME.colors.brand}>
                        {`Queued (${queuedPrompts.length}): "${queuedPrompts[0]}"`}
                        {queuedPrompts.length > 1 ? ` (+${queuedPrompts.length - 1} more)` : ''}
                    </Text>
                </Box>
            )}

            {/* file mention popup */}
            {showFileMenu && matchingFiles.length > 0 && (
                <Box flexDirection="column" paddingLeft={1} marginBottom={0}>
                    {matchingFiles.map((file, idx) => {
                        const isSelected = idx === selectedFileIndex
                        return (
                            <Box key={file} flexDirection="row" gap={1}>
                                <Text color={isSelected ? THEME.colors.brand : THEME.colors.muted}>
                                    {isSelected ? `${THEME.glyphs.selector} ` : '  '}
                                </Text>
                                <Text color={isSelected ? THEME.colors.brand : THEME.colors.text}>
                                    {file}
                                </Text>
                            </Box>
                        )
                    })}
                </Box>
            )}

            {/* top separator */}
            <Box overflow="hidden" height={1} width="100%">
                <Text color={THEME.colors.border} wrap="truncate">
                    {sep}
                </Text>
            </Box>

            {/* content: prompt */}
            <Box width="100%" paddingRight={4}>
                <Text
                    color={disabled ? THEME.colors.muted : THEME.colors.brand}
                >{`${THEME.glyphs.prompt} `}</Text>
                {grillMode && <Text color={THEME.colors.brand}>/grill-me </Text>}
                {(!authUI || customInputMode) && (
                    <TextArea
                        value={value}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                        onHistoryUp={handleHistoryUp}
                        onHistoryDown={handleHistoryDown}
                        placeholder={
                            customInputMode
                                ? 'Type your custom answer...'
                                : grillMode
                                  ? ''
                                  : placeholder
                        }
                        focus={!disabled && !dialog.isOpen}
                        disableHistoryNav={showCommandMenu || showFileMenu || showShortcutsMenu}
                    />
                )}
            </Box>

            {/* bottom separator */}
            <Box overflow="hidden" height={1} width="100%">
                <Text color={THEME.colors.border} wrap="truncate">
                    {sep}
                </Text>
            </Box>

            {/* status row — clean & minimal: <model> (<authMethod>)                  ? for shortcuts */}
            {!showCommandMenu && !showShortcutsMenu && !authUI && (
                <Box width="100%" justifyContent="space-between">
                    <Box gap={2} alignItems="center" flexShrink={1}>
                        <Box gap={1} flexShrink={1}>
                            <Text color={THEME.colors.muted}>
                                {activeModel}
                                {hasBothAuth && authMethod
                                    ? ` (${authMethod === 'december' ? 'December Cloud' : 'BYOK'})`
                                    : ''}
                            </Text>
                            {activeToast ? (
                                <Text
                                    wrap="truncate"
                                    color={
                                        activeToast.variant === 'success'
                                            ? THEME.colors.success
                                            : activeToast.variant === 'error'
                                              ? THEME.colors.error
                                              : THEME.colors.muted
                                    }
                                >
                                    · {activeToast.message.replace(/\s+/g, ' ').trim()}
                                </Text>
                            ) : showExitConfirm ? (
                                <Text color={THEME.colors.muted}>· Press Ctrl+C again to exit</Text>
                            ) : null}
                        </Box>
                    </Box>
                    <Box gap={0} flexShrink={0} marginLeft={2}>
                        <Text color={THEME.colors.muted}>? for shortcuts</Text>
                    </Box>
                </Box>
            )}

            {/* auth ui */}
            {authUI && <Box paddingBottom={1}>{authUI}</Box>}

            {/* command dropdown */}
            {showCommandMenu && (
                <CommandMenu
                    query={commandQuery}
                    selectedIndex={selectedIndex}
                    windowStart={windowStart}
                    totalFiltered={0}
                    onSelect={setSelectedIndex}
                    onExecute={(index) => {
                        const command = resolveCommand(index)
                        handleCommand(command)
                    }}
                />
            )}

            {/* shortcuts dropdown */}
            {showShortcutsMenu && (
                <ShortcutsMenu
                    onClose={() => {
                        setShowShortcutsMenu(false)
                        setValue('')
                    }}
                />
            )}
        </Box>
    )
})
