import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState, useCallback } from 'react'

import { useKeyboardLayer } from '../providers/keyboard-layer'
import { THEME } from '../theme'

import type { ReactNode } from 'react'

type DialogSearchListProps<T> = {
    items: T[]
    onSelect: (item: T) => void
    onHighlight?: (item: T) => void
    filterFn: (item: T, query: string) => boolean
    renderItem: (item: T, isSelected: boolean) => ReactNode
    getKey: (item: T) => string
    placeholder?: string
    emptyText?: string
}

const MAX_VISIBLE_ITEMS = 6

export function DialogSearchList<T>({
    items,
    onSelect,
    onHighlight,
    filterFn,
    renderItem,
    getKey,
    placeholder = 'Search',
    emptyText = 'No results',
}: DialogSearchListProps<T>) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [searchValue, setSearchValue] = useState('')
    const { isTopLayer } = useKeyboardLayer()

    const handleChange = useCallback((value: string) => {
        setSearchValue(value)
        setSelectedIndex(0)
    }, [])

    const filtered = searchValue ? items.filter((item) => filterFn(item, searchValue)) : items
    const visible = filtered.slice(0, MAX_VISIBLE_ITEMS)

    useInput((_input, key) => {
        if (!isTopLayer('dialog')) return

        if (key.return) {
            const item = filtered[selectedIndex]
            if (item) onSelect(item)
        } else if (key.upArrow) {
            setSelectedIndex((i) => {
                const newIndex = Math.max(0, i - 1)
                const item = filtered[newIndex]
                if (item && onHighlight) onHighlight(item)
                return newIndex
            })
        } else if (key.downArrow) {
            setSelectedIndex((i) => {
                const newIndex = Math.min(filtered.length - 1, i + 1)
                const item = filtered[newIndex]
                if (item && onHighlight) onHighlight(item)
                return newIndex
            })
        }
    })

    return (
        <Box flexDirection="column" gap={1}>
            <TextInput
                value={searchValue}
                onChange={handleChange}
                placeholder={placeholder}
                focus
            />
            {filtered.length === 0 ? (
                <Text dimColor>{emptyText}</Text>
            ) : (
                <Box flexDirection="column">
                    {visible.map((item, i) => {
                        const isSelected = i === selectedIndex
                        return (
                            <Box key={getKey(item)}>
                                <Text
                                    color={isSelected ? THEME.colors.brand : undefined}
                                    dimColor={!isSelected}
                                >
                                    {isSelected ? `${THEME.glyphs.selector} ` : '  '}
                                </Text>
                                {renderItem(item, isSelected)}
                            </Box>
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}
