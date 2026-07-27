import { Box, Text, useInput } from 'ink'
import { useState } from 'react'

const MODELS = [
    { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash' },
    { id: 'gemini-3.1-pro', label: 'gemini-3.1-pro' },
    { id: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest' },
    { id: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest' },
    { id: 'o3-mini', label: 'o3-mini' },
    { id: 'gpt-4o', label: 'gpt-4o' },
    { id: 'deepseek-chat', label: 'deepseek-chat' },
    { id: 'deepseek-reasoner', label: 'deepseek-reasoner' },
]

const WINDOW_SIZE = 5

export function ModelSelector() {
    const [open, setOpen] = useState(false)
    const [selectedId, setSelectedId] = useState(MODELS[0]!.id)
    const [cursor, setCursor] = useState(0)
    const [windowStart, setWindowStart] = useState(0)

    const currentModel = MODELS.find((m) => m.id === selectedId) ?? MODELS[0]!

    useInput((_input, key) => {
        if (!open) return
        if (key.escape) {
            setOpen(false)
        } else if (key.upArrow) {
            setCursor((c) => {
                const next = Math.max(0, c - 1)
                setWindowStart((ws) => (next < ws ? next : ws))
                return next
            })
        } else if (key.downArrow) {
            setCursor((c) => {
                const next = Math.min(MODELS.length - 1, c + 1)
                setWindowStart((ws) => (next >= ws + WINDOW_SIZE ? next - WINDOW_SIZE + 1 : ws))
                return next
            })
        } else if (key.return) {
            setSelectedId(MODELS[cursor]!.id)
            setOpen(false)
        }
    })

    if (open) {
        const windowEnd = Math.min(windowStart + WINDOW_SIZE, MODELS.length)
        const visibleModels = MODELS.slice(windowStart, windowEnd)
        const itemsAbove = windowStart
        const itemsBelow = MODELS.length - windowEnd

        return (
            <Box flexDirection="column">
                {itemsAbove > 0 && <Text color="#AAAAAA">↑ {itemsAbove} more</Text>}
                {visibleModels.map((model, relIdx) => {
                    const absIdx = windowStart + relIdx
                    const isActive = absIdx === cursor
                    return (
                        <Box key={model.id}>
                            <Text color={isActive ? '#89B4F8' : '#AAAAAA'}>
                                {isActive ? '❭ ' : '  '}
                                {model.label}
                            </Text>
                        </Box>
                    )
                })}
                {itemsBelow > 0 && <Text color="#AAAAAA">↓ {itemsBelow} more</Text>}
                <Box marginTop={1} gap={1}>
                    <Text color="#89B4F8">↑↓</Text>
                    <Text color="#AAAAAA">Navigate</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">enter</Text>
                    <Text color="#AAAAAA">Select</Text>
                    <Text color="#AAAAAA">·</Text>
                    <Text color="#89B4F8">esc</Text>
                    <Text color="#AAAAAA">Cancel</Text>
                </Box>
            </Box>
        )
    }

    // closed: just show model name
    return <Text color="#888888">{currentModel.label}</Text>
}
