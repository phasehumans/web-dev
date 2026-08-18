import { Text, useInput } from 'ink'
import React, { useState, useEffect, useRef } from 'react'

import { THEME } from '../theme'

type Props = {
    value: string
    onChange: (value: string) => void
    onSubmit: (value: string) => void
    onHistoryUp?: () => void
    onHistoryDown?: () => void
    placeholder?: string
    focus?: boolean
    disableHistoryNav?: boolean
}

export function TextArea({
    value,
    onChange,
    onSubmit,
    onHistoryUp,
    onHistoryDown,
    placeholder = '',
    focus = true,
    disableHistoryNav = false,
}: Props) {
    const [cursorOffset, setCursorOffset] = useState(value.length)
    const prevValueRef = useRef(value)

    useEffect(() => {
        if (value !== prevValueRef.current) {
            // When value changes from outside (e.g. autocomplete, history navigation, clear)
            if (
                Math.abs(value.length - prevValueRef.current.length) > 1 ||
                !value.startsWith(prevValueRef.current)
            ) {
                setCursorOffset(value.length)
            } else if (cursorOffset > value.length) {
                setCursorOffset(value.length)
            }
            prevValueRef.current = value
        }
    }, [value, cursorOffset])

    useInput((input, key) => {
        if (!focus) return

        if (key.return) {
            if (key.meta) {
                const newValue = value.slice(0, cursorOffset) + '\n' + value.slice(cursorOffset)
                onChange(newValue)
                setCursorOffset((prev) => prev + 1)
            } else {
                onSubmit(value)
            }
            return
        }

        if (key.leftArrow) {
            setCursorOffset((prev) => Math.max(0, prev - 1))
            return
        }
        if (key.rightArrow) {
            setCursorOffset((prev) => Math.min(value.length, prev + 1))
            return
        }
        if (key.upArrow) {
            if (disableHistoryNav) return
            const lines = value.slice(0, cursorOffset).split('\n')
            if (lines.length > 1) {
                const currentLineLength = lines[lines.length - 1]?.length || 0
                const prevLineLength = lines[lines.length - 2]?.length || 0
                const newCol = Math.min(currentLineLength, prevLineLength)
                const newOffset = cursorOffset - currentLineLength - 1 - (prevLineLength - newCol)
                setCursorOffset(Math.max(0, newOffset))
            } else {
                if (cursorOffset === 0 && onHistoryUp) {
                    onHistoryUp()
                } else {
                    setCursorOffset(0)
                }
            }
            return
        }
        if (key.downArrow) {
            if (disableHistoryNav) return
            const postLines = value.slice(cursorOffset).split('\n')
            if (postLines.length > 1) {
                const preLines = value.slice(0, cursorOffset).split('\n')
                const currentLineLength = preLines[preLines.length - 1]?.length || 0
                const nextLineLength = postLines[1]?.length || 0
                const newCol = Math.min(currentLineLength, nextLineLength)
                const postLineZeroLength = postLines[0]?.length || 0
                const newOffset = cursorOffset + postLineZeroLength + 1 + newCol
                setCursorOffset(Math.min(value.length, newOffset))
            } else {
                if (cursorOffset === value.length && onHistoryDown) {
                    onHistoryDown()
                } else {
                    setCursorOffset(value.length)
                }
            }
            return
        }
        if (key.backspace || key.delete) {
            if (cursorOffset > 0) {
                const newValue = value.slice(0, cursorOffset - 1) + value.slice(cursorOffset)
                onChange(newValue)
                setCursorOffset((prev) => prev - 1)
            }
            return
        }

        if (key.ctrl && input === 'a') {
            setCursorOffset(0)
            return
        }
        if (key.ctrl && input === 'e') {
            setCursorOffset(value.length)
            return
        }
        if (key.ctrl && input === 'k') {
            const newValue = value.slice(0, cursorOffset)
            onChange(newValue)
            return
        }
        if (key.ctrl && input === 'u') {
            const newValue = value.slice(cursorOffset)
            onChange(newValue)
            setCursorOffset(0)
            return
        }

        if (key.ctrl) return

        if (input) {
            const newValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset)
            onChange(newValue)
            setCursorOffset((prev) => prev + input.length)
        }
    })

    if (!value && placeholder) {
        return (
            <Text color={THEME.colors.muted}>
                {focus ? <Text inverse>{placeholder[0] || ' '}</Text> : null}
                {placeholder.slice(focus ? 1 : 0)}
            </Text>
        )
    }

    // Determine token colors for syntax highlighting
    // 1. Slash command at start (e.g. /model, /plan)
    let cmdEnd = -1
    if (value.startsWith('/')) {
        const spaceIdx = value.indexOf(' ')
        cmdEnd = spaceIdx === -1 ? value.length : spaceIdx
    }

    // 2. @file mentions (e.g. @ or @src/app.tsx)
    const mentionRanges: [number, number][] = []
    const mentionRegex = /@\S*/g
    let match: RegExpExecArray | null
    while ((match = mentionRegex.exec(value)) !== null) {
        if (match[0].length > 0) {
            mentionRanges.push([match.index, match.index + match[0].length])
        }
    }

    const getCharColor = (index: number): string => {
        if (value.startsWith('?') && index === 0) {
            return THEME.colors.brand
        }
        if (cmdEnd > 0 && index < cmdEnd) {
            return THEME.colors.brand
        }
        for (const [start, end] of mentionRanges) {
            if (index >= start && index < end) {
                return THEME.colors.brand
            }
        }
        return THEME.colors.text
    }

    const chars = value.split('')
    const elements: React.ReactNode[] = []

    for (let i = 0; i < chars.length; i++) {
        const char = chars[i]
        const isCursor = i === cursorOffset && focus
        const color = getCharColor(i)

        if (isCursor) {
            elements.push(
                <Text key={i} color={color} inverse>
                    {char}
                </Text>
            )
        } else {
            elements.push(
                <Text key={i} color={color}>
                    {char}
                </Text>
            )
        }
    }

    // Cursor at the very end of the line
    if (cursorOffset >= chars.length && focus) {
        elements.push(
            <Text key="cursor-end" inverse>
                {' '}
            </Text>
        )
    }

    return <Text>{elements}</Text>
}
