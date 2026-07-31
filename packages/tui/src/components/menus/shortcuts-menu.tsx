import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

const CMD_COL_WIDTH = 34
const WINDOW_SIZE = 15

export const SHORTCUTS = [
    { key: '/', desc: 'Open slash commands' },
    { key: 'ctrl+a', desc: 'Go to start' },
    { key: 'ctrl+e', desc: 'Go to end' },
    { key: 'ctrl+k', desc: 'Delete to end' },
    { key: 'ctrl+u', desc: 'Delete to start' },
    { key: 'ctrl+w', desc: 'Delete word' },
    { key: 'up/down', desc: 'Input history' },
    { key: 'ctrl+y', desc: 'Quick copy (yank)' },
    { key: 'ctrl+c', desc: 'Exit / Graceful interrupt' },
    { key: 'ctrl+h', desc: 'Session history' },
    { key: 'ctrl+l', desc: 'Login / Account menu' },
    { key: 'ctrl+o', desc: 'Toggle expand commands' },
    { key: 'ctrl+t', desc: 'Tasks mode' },
    { key: 'alt+enter', desc: 'Insert newline' },
    { key: 'esc', desc: 'Cancel / Close menu' },
]

export function ShortcutsMenu({ onClose }: { onClose: () => void }) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [windowStart, setWindowStart] = useState(0)

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex((prev) => {
                const next = Math.max(0, prev - 1)
                if (next < windowStart) setWindowStart(next)
                return next
            })
        }
        if (key.downArrow) {
            setSelectedIndex((prev) => {
                const next = Math.min(SHORTCUTS.length - 1, prev + 1)
                if (next >= windowStart + WINDOW_SIZE) {
                    setWindowStart(next - WINDOW_SIZE + 1)
                }
                return next
            })
        }
        if (key.escape || (key.ctrl && input === 'c')) {
            onClose()
        }
    })

    const windowEnd = Math.min(windowStart + WINDOW_SIZE, SHORTCUTS.length)
    const visibleItems = SHORTCUTS.slice(windowStart, windowEnd)
    const itemsAbove = windowStart
    const itemsBelow = SHORTCUTS.length - windowEnd

    return (
        <Box flexDirection="column">
            {/* ↑ n more */}
            {itemsAbove > 0 && (
                <Box paddingLeft={2}>
                    <Text color="#AAAAAA">↑ {itemsAbove} more</Text>
                </Box>
            )}

            {/* rows */}
            {visibleItems.map((cmd, relIdx) => {
                const absIdx = windowStart + relIdx
                const isSelected = absIdx === selectedIndex
                return (
                    <Box key={cmd.key} paddingLeft={2}>
                        <Text color={isSelected ? '#89B4F8' : '#AAAAAA'}>
                            {isSelected ? '> ' : '  '}
                        </Text>
                        <Box width={CMD_COL_WIDTH}>
                            <Text color={isSelected ? '#89B4F8' : '#AAAAAA'} bold={false}>
                                {cmd.key}
                            </Text>
                        </Box>
                        <Text color="#AAAAAA">{cmd.desc}</Text>
                    </Box>
                )
            })}

            {/* ↓ n more */}
            {itemsBelow > 0 && (
                <Box paddingLeft={2}>
                    <Text color="#AAAAAA">↓ {itemsBelow} more</Text>
                </Box>
            )}

            <Box paddingLeft={2} paddingTop={1}>
                <Text color="#AAAAAA">
                    [{selectedIndex + 1}-{windowEnd} of {SHORTCUTS.length} items]
                </Text>
            </Box>

            {/* footer */}
            <Box flexDirection="column" paddingLeft={2} paddingTop={1} paddingBottom={1}>
                <Box gap={2}>
                    <Box gap={1}>
                        <Text color="#89B4F8">↑/↓</Text>
                        <Text color="#AAAAAA">Navigate</Text>
                    </Box>
                    <Box gap={1}>
                        <Text color="#89B4F8">esc</Text>
                        <Text color="#AAAAAA">Close</Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
