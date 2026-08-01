import { Box, Text, useInput } from 'ink'
import { useState, useCallback, useRef } from 'react'

import { useDialog, InlineDialog } from '../providers/dialog'
import { useToast } from '../providers/toast'

import { CommandMenu } from './command-menu'
import { useCommandMenu } from './command-menu/use-command-menu'
import { ShortcutsMenu } from './menus/shortcuts-menu'
import { TextArea } from './text-area'
// modelselector removed in favor of passing activemodel as prop

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
    planMode?: boolean
    grillMode?: boolean
    customInputMode?: boolean
    onInterrupt?: () => void
    onCopy?: () => void
    contextTokens?: number
    history?: string[]
    showExitConfirm?: boolean
    toasts?: { id: string; message: string; variant?: string }[]
    queuedPrompts?: string[]
}

export function InputBar({
    onSubmit,
    disabled = false,
    placeholder = 'Ask December to build...',
    activeModel = 'unknown',
    authMethod,
    hasBothAuth = false,
    authUI,
    agent,
    resetChat,
    grillMode = false,
    customInputMode = false,
    onInterrupt,
    onCopy,
    contextTokens,
    history,
    showExitConfirm = false,
    toasts,
    queuedPrompts,
}: Props) {
    const [value, setValue] = useState('')
    const toast = useToast()
    const dialog = useDialog()

    const activeToast =
        toasts && toasts.length > 0
            ? toasts[toasts.length - 1]
            : toast.currentToast
              ? { message: toast.currentToast.message, variant: toast.currentToast.variant }
              : null

    const {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        windowStart,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
    } = useCommandMenu()

    const [showShortcutsMenu, setShowShortcutsMenu] = useState(false)

    const isCtrlW = useRef(false)
    useInput((input, key) => {
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
        },
        [disabled, handleContentChange, showShortcutsMenu]
    )

    const handleCommand = useCallback(
        (command: Command | undefined) => {
            if (!command) return

            const currentValue = value.trim()
            setValue('')
            handleContentChange('')

            // forward auth commands to chat component
            if (
                command.value === '/grill-me' ||
                command.value === '/login' ||
                command.value === '/logout' ||
                command.value === '/exit' ||
                command.value === '/model' ||
                command.value === '/resume' ||
                command.value === '/settings' ||
                command.value === '/context' ||
                command.value === '/tasks' ||
                command.value === '/usage' ||
                command.value === '/feedback'
            ) {
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
                })
            }
        },
        [toast, dialog, agent, resetChat, handleContentChange, onSubmit]
    )

    const handleSubmit = useCallback(
        (text: string) => {
            if (disabled) return
            if (showCommandMenu) {
                const command = resolveCommand(selectedIndex)
                handleCommand(command)
                return
            }
            if (showShortcutsMenu) {
                // ignoring submit for shortcuts menu, it closes on escape
                return
            }
            const trimmed = text.trim()
            if (trimmed.length === 0) return
            // save to history (we will implement global history in app, or just pass it in here later)
            onSubmit(trimmed)
            setValue('')
            handleContentChange('')
        },
        [
            disabled,
            showCommandMenu,
            resolveCommand,
            selectedIndex,
            handleCommand,
            onSubmit,
            handleContentChange,
        ]
    )

    const sep = '─'.repeat(400)

    return (
        <Box flexDirection="column" paddingX={2} marginTop={1}>
            {/* inline dialog — shown on right above prompt when open */}
            {dialog.isOpen && dialog.currentDialog && (
                <Box justifyContent="flex-end">
                    <InlineDialog config={dialog.currentDialog} close={dialog.close} />
                </Box>
            )}
            {/* queued prompts indicator */}
            {queuedPrompts && queuedPrompts.length > 0 && (
                <Box width="100%" marginBottom={0}>
                    <Text color="#89B4F8">
                        {`Queued (${queuedPrompts.length}): "${queuedPrompts[0]}"`}
                        {queuedPrompts.length > 1 ? ` (+${queuedPrompts.length - 1} more)` : ''}
                    </Text>
                </Box>
            )}
            {/* top separator */}
            <Box overflow="hidden" height={1} width="100%">
                <Text color="#555555" wrap="truncate">
                    {sep}
                </Text>
            </Box>

            {/* content: prompt */}
            <Box width="100%" paddingRight={4}>
                <Text color={disabled ? '#555555' : '#89B4F8'}>{`❭ `}</Text>
                {grillMode && <Text color="#89B4F8">/grill-me </Text>}
                {(!authUI || customInputMode) && (
                    <TextArea
                        value={value}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                        placeholder={
                            customInputMode
                                ? 'Type your custom answer...'
                                : grillMode
                                  ? ''
                                  : placeholder
                        }
                        focus={!disabled && !dialog.isOpen}
                        history={history}
                    />
                )}
            </Box>

            {/* bottom separator */}
            <Box overflow="hidden" height={1} width="100%">
                <Text color="#555555" wrap="truncate">
                    {sep}
                </Text>
            </Box>

            {/* status row — model left, december studio right */}
            {!showCommandMenu && !showShortcutsMenu && !authUI && (
                <Box width="100%" justifyContent="space-between">
                    <Box gap={2} alignItems="center" flexShrink={1}>
                        <Box gap={1} flexShrink={1}>
                            <Text color="#AAAAAA">
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
                                            ? '#6EE7B7'
                                            : activeToast.variant === 'error'
                                              ? '#FCA5A5'
                                              : 'gray'
                                    }
                                >
                                    · {activeToast.message.replace(/\s+/g, ' ').trim()}
                                </Text>
                            ) : showExitConfirm ? (
                                <Text color="gray">· Press Ctrl+C again to exit</Text>
                            ) : (
                                contextTokens !== undefined &&
                                contextTokens > 0 && (
                                    <Text color="#AAAAAA">· {contextTokens} tokens</Text>
                                )
                            )}
                        </Box>
                    </Box>
                    <Box gap={0} flexShrink={0} marginLeft={2}>
                        <Text color="#AAAAAA">? for shortcuts</Text>
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
}
