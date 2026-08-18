import { useInput } from 'ink'
import { useState, useMemo, useCallback } from 'react'

import { useKeyboardLayer } from '../../providers/keyboard-layer'

import { getFilteredCommands } from './filter-commands'

import type { Command } from './types'

const WINDOW_SIZE = 5

export type UseCommandMenuOptions = {
    onAutocomplete?: (completedText: string) => void
}

export type UseCommandMenuReturn = {
    showCommandMenu: boolean
    commandQuery: string
    selectedIndex: number
    windowStart: number
    handleContentChange: (text: string) => void
    resolveCommand: (index: number) => Command | undefined
    setSelectedIndex: (index: number) => void
    moveSelection: (direction: 'up' | 'down') => void
}

export function useCommandMenu(options?: UseCommandMenuOptions): UseCommandMenuReturn {
    const [textValue, setTextValue] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [windowStart, setWindowStart] = useState(0)
    const [showCommandMenu, setShowCommandMenu] = useState(false)
    const { push, pop } = useKeyboardLayer()

    const commandQuery = showCommandMenu && textValue.startsWith('/') ? textValue.slice(1) : ''
    const filteredCommands = useMemo(() => getFilteredCommands(commandQuery), [commandQuery])

    const close = useCallback(() => {
        setShowCommandMenu(false)
        setSelectedIndex(0)
        setWindowStart(0)
        pop('command')
    }, [pop])

    const handleContentChange = useCallback(
        (text: string) => {
            setTextValue(text)
            setSelectedIndex(0)
            setWindowStart(0)

            const prefix = text.startsWith('/') ? text.slice(1) : null
            if (prefix !== null && !prefix.includes(' ')) {
                setShowCommandMenu(true)
                push('command', () => {
                    close()
                    return true
                })
            } else {
                close()
            }
        },
        [push, close]
    )

    const resolveCommand = useCallback(
        (index: number): Command | undefined => {
            const command = filteredCommands[index]
            if (command) close()
            return command
        },
        [filteredCommands, close]
    )

    const moveSelection = useCallback(
        (direction: 'up' | 'down') => {
            if (!showCommandMenu) return

            setSelectedIndex((prev) => {
                const maxIdx = filteredCommands.length - 1
                let next = prev

                if (direction === 'up') {
                    next = Math.max(0, prev - 1)
                } else {
                    next = Math.min(maxIdx, prev + 1)
                }

                // scroll window to keep selected item visible
                setWindowStart((ws) => {
                    if (next < ws) return next // scroll up
                    if (next >= ws + WINDOW_SIZE) return next - WINDOW_SIZE + 1 // scroll down
                    return ws
                })

                return next
            })
        },
        [showCommandMenu, filteredCommands.length]
    )

    useInput((input, key) => {
        if (!showCommandMenu) return

        if (key.escape) {
            close()
        } else if (key.upArrow) {
            moveSelection('up')
        } else if (key.downArrow) {
            moveSelection('down')
        } else if (key.tab || input === '\t') {
            const command = filteredCommands[selectedIndex]
            if (command) {
                if (options?.onAutocomplete) {
                    options.onAutocomplete(`/${command.name} `)
                }
                close()
            }
        }
    })

    return {
        showCommandMenu,
        commandQuery,
        selectedIndex,
        windowStart,
        handleContentChange,
        resolveCommand,
        setSelectedIndex,
        moveSelection,
    }
}
