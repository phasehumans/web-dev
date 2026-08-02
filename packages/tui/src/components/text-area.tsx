import { Text, useInput } from 'ink'
import React, { useState, useEffect } from 'react'

type Props = {
    value: string
    onChange: (value: string) => void
    onSubmit: (value: string) => void
    placeholder?: string
    focus?: boolean
}

export function TextArea({ value, onChange, onSubmit, placeholder = '', focus = true }: Props) {
    const [cursorOffset, setCursorOffset] = useState(value.length)

    useEffect(() => {
        if (cursorOffset > value.length) {
            setCursorOffset(value.length)
        }
    }, [value, cursorOffset])

    useInput((input, key) => {
        if (!focus) return

        if (key.return) {
            // some terminals send shift+enter as a specific escape sequence, but usually it's indistinguishable.
            // let's check for alt+enter (meta) or we can just make enter submit.
            // if we want alt+enter for newline:
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
            // simple up: go to start of line or previous line
            const lines = value.slice(0, cursorOffset).split('\n')
            if (lines.length > 1) {
                const currentLineLength = lines[lines.length - 1]?.length || 0
                const prevLineLength = lines[lines.length - 2]?.length || 0
                const newCol = Math.min(currentLineLength, prevLineLength)
                const newOffset = cursorOffset - currentLineLength - 1 - (prevLineLength - newCol)
                setCursorOffset(Math.max(0, newOffset))
            } else {
                setCursorOffset(0)
            }
            return
        }
        if (key.downArrow) {
            const preLines = value.slice(0, cursorOffset).split('\n')
            const currentLineLength = preLines[preLines.length - 1]?.length || 0

            const postLines = value.slice(cursorOffset).split('\n')
            if (postLines.length > 1) {
                const nextLineLength = postLines[1]?.length || 0
                const newCol = Math.min(currentLineLength, nextLineLength)
                const postLineZeroLength = postLines[0]?.length || 0
                const newOffset = cursorOffset + postLineZeroLength + 1 + newCol
                setCursorOffset(Math.min(value.length, newOffset))
            } else {
                setCursorOffset(value.length)
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

        // ignore other ctrl commands here, let parent handle ctrl+w or handle it here
        if (key.ctrl) return

        if (input) {
            const newValue = value.slice(0, cursorOffset) + input + value.slice(cursorOffset)
            onChange(newValue)
            setCursorOffset((prev) => prev + input.length)
        }
    })

    if (!value && placeholder) {
        return <Text color="gray">{placeholder}</Text>
    }

    const beforeCursor = value.slice(0, cursorOffset)
    const atCursor = value.slice(cursorOffset, cursorOffset + 1) || ' '
    const afterCursor = value.slice(cursorOffset + 1)

    return (
        <Text>
            {beforeCursor}
            {focus ? <Text inverse>{atCursor}</Text> : <Text>{atCursor}</Text>}
            {afterCursor}
        </Text>
    )
}
