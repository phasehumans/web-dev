import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import React, { useState, useMemo, useRef } from 'react'

import { useTerminalColumns } from '../../hooks/use-terminal-columns'
import { THEME } from '../../theme'

import { MenuFooter } from './menu-footer'

export function SessionSelectMenu(props: any) {
    const {
        sessionRenameMode,
        sessionNewName,
        setSessionNewName,
        sessionsData = [],
        sessionPage = 0,
        sessionSelectedIndex = 0,
        sessionRepository,
        setSessionsData,
        setSessionRenameMode,
        setSessionSelectedIndex,
        setSessionPage,
        handleSessionSelect,
        setAuthMode,
    } = props

    const [isSearching, setIsSearching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const columns = useTerminalColumns()
    const SESSION_PAGE_SIZE = 10

    const filteredSessions = useMemo(() => {
        if (!searchQuery.trim()) return sessionsData
        const q = searchQuery.toLowerCase()
        return sessionsData.filter((s: any) => {
            const idMatch = (s.id || '').toLowerCase().includes(q)
            const previewMatch = (s.preview || '').toLowerCase().includes(q)
            return idMatch || previewMatch
        })
    }, [sessionsData, searchQuery])

    const totalItems = filteredSessions.length
    const maxPage = Math.max(0, Math.ceil(totalItems / SESSION_PAGE_SIZE) - 1)
    const startIndex = sessionPage * SESSION_PAGE_SIZE
    const visibleItems = filteredSessions.slice(startIndex, startIndex + SESSION_PAGE_SIZE)

    const selectedIdxRef = useRef(sessionSelectedIndex)
    selectedIdxRef.current = sessionSelectedIndex

    const pageRef = useRef(sessionPage)
    pageRef.current = sessionPage

    const isSearchingRef = useRef(isSearching)
    isSearchingRef.current = isSearching

    const timeAgo = (date: Date | string) => {
        if (!date) return ''
        const d = typeof date === 'string' ? new Date(date) : date
        const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000)
        if (seconds < 60) return `${Math.max(0, seconds)}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        const days = Math.floor(hours / 24)
        return `${days}d ago`
    }

    const handleRenameSubmit = (val: string) => {
        const absIndex = startIndex + selectedIdxRef.current
        const session = filteredSessions[absIndex]
        const newName = val.trim()
        if (session && newName && newName !== session.id) {
            if (sessionRepository?.renameSession) {
                sessionRepository.renameSession(session.id, newName).then(() => {
                    const nextData = sessionsData.map((s: any) =>
                        s.id === session.id ? { ...s, id: newName, preview: newName } : s
                    )
                    setSessionsData(nextData)
                })
            }
        }
        setSessionRenameMode(false)
        setSessionNewName('')
    }

    useInput((input, key) => {
        // 1. Rename Mode
        if (sessionRenameMode) {
            if (key.escape) {
                setSessionRenameMode(false)
                setSessionNewName('')
            }
            return
        }

        // 2. Search Mode (Vim style / search active)
        if (isSearchingRef.current) {
            if (key.escape) {
                setIsSearching(false)
                return
            }
            if (key.downArrow || key.return) {
                setIsSearching(false)
                return
            }
            return
        }

        // 3. Normal / Navigation Mode (Vim style single-key hotkeys)
        if (input === '/' || input === 's') {
            setIsSearching(true)
            return
        }

        if (input === 'r' || input === 'R') {
            const absIndex = startIndex + selectedIdxRef.current
            const session = filteredSessions[absIndex]
            if (session) {
                setSessionNewName(session.id)
                setSessionRenameMode(true)
            }
            return
        }

        if (input === 'd' || input === 'D') {
            const absIndex = startIndex + selectedIdxRef.current
            const session = filteredSessions[absIndex]
            if (session) {
                if (sessionRepository?.deleteSession) {
                    sessionRepository.deleteSession(session.id).catch(() => {
                        // Intentionally swallowed: ignore session deletion failures
                    })
                }
                const nextData = sessionsData.filter((s: any) => s.id !== session.id)
                setSessionsData(nextData)

                const nextFiltered = searchQuery.trim()
                    ? nextData.filter((s: any) => {
                          const q = searchQuery.toLowerCase()
                          return (
                              (s.id || '').toLowerCase().includes(q) ||
                              (s.preview || '').toLowerCase().includes(q)
                          )
                      })
                    : nextData

                const nextTotalItems = nextFiltered.length
                const nextMaxPage = Math.max(0, Math.ceil(nextTotalItems / SESSION_PAGE_SIZE) - 1)
                const newPage = Math.min(pageRef.current, nextMaxPage)
                setSessionPage(newPage)

                const newStartIndex = newPage * SESSION_PAGE_SIZE
                const newVisibleCount = nextFiltered.slice(
                    newStartIndex,
                    newStartIndex + SESSION_PAGE_SIZE
                ).length
                if (selectedIdxRef.current >= newVisibleCount) {
                    setSessionSelectedIndex(Math.max(0, newVisibleCount - 1))
                }
            }
            return
        }

        if (key.upArrow || input === 'k') {
            if (selectedIdxRef.current > 0) {
                setSessionSelectedIndex(selectedIdxRef.current - 1)
            } else if (pageRef.current > 0) {
                setSessionPage(pageRef.current - 1)
                setSessionSelectedIndex(SESSION_PAGE_SIZE - 1)
            }
            return
        }
        if (key.downArrow || input === 'j') {
            if (selectedIdxRef.current < visibleItems.length - 1) {
                setSessionSelectedIndex(selectedIdxRef.current + 1)
            } else if (pageRef.current < maxPage) {
                setSessionPage(pageRef.current + 1)
                setSessionSelectedIndex(0)
            }
            return
        }
        if (key.leftArrow || input === 'h') {
            if (pageRef.current > 0) {
                setSessionPage(pageRef.current - 1)
                setSessionSelectedIndex(0)
            }
            return
        }
        if (key.rightArrow || input === 'l') {
            if (pageRef.current < maxPage) {
                setSessionPage(pageRef.current + 1)
                setSessionSelectedIndex(0)
            }
            return
        }
        if (key.return) {
            const absIndex = startIndex + selectedIdxRef.current
            const session = filteredSessions[absIndex]
            if (session) {
                handleSessionSelect({ value: session.id })
            }
            return
        }
        if (key.escape) {
            if (searchQuery) {
                setSearchQuery('')
                setSessionPage(0)
                setSessionSelectedIndex(0)
                return
            }
            if (setAuthMode) setAuthMode('none')
            return
        }
    })

    // Compute dynamic width for session title
    const paddingWidth = THEME.padding.paddingX * 2
    const indicatorWidth = 2
    const timeWidth = 14
    const availableWidth = Math.max(20, columns - paddingWidth - indicatorWidth - timeWidth - 4)

    const footerItems = sessionRenameMode
        ? [
              { key: 'enter', label: 'Save Name' },
              { key: 'esc', label: 'Cancel' },
          ]
        : isSearching
          ? [
                { key: 'enter / ↓', label: 'Focus List' },
                { key: 'esc', label: 'Exit Search' },
            ]
          : [
                { key: '↑/↓', label: 'Navigate' },
                { key: '←/→', label: 'Page' },
                { key: 'enter', label: 'Select' },
                { key: '/', label: 'Search' },
                { key: 'r', label: 'Rename' },
                { key: 'd', label: 'Delete' },
                { key: 'esc', label: 'Cancel' },
            ]

    return (
        <Box flexDirection="column" paddingX={THEME.padding.paddingX}>
            <Box marginBottom={1} flexDirection="column" gap={1}>
                <Text color={THEME.colors.text}>Sessions</Text>
                <Box flexDirection="row" gap={1}>
                    <Text color={isSearching ? THEME.colors.brand : THEME.colors.muted}>
                        Search:
                    </Text>
                    {isSearching ? (
                        <TextInput
                            value={searchQuery}
                            onChange={(val) => {
                                setSearchQuery(val)
                                setSessionPage(0)
                                setSessionSelectedIndex(0)
                            }}
                            onSubmit={() => setIsSearching(false)}
                            placeholder="Filter by title or ID..."
                            focus={true}
                        />
                    ) : (
                        <Text color={searchQuery ? THEME.colors.text : THEME.colors.muted}>
                            {searchQuery ? (
                                <Text>
                                    {searchQuery}{' '}
                                    <Text color={THEME.colors.muted}>[/ to filter]</Text>
                                </Text>
                            ) : (
                                '[/ to filter]'
                            )}
                        </Text>
                    )}
                </Box>
            </Box>

            {visibleItems.map((session: any, idx: number) => {
                const isSelected = idx === sessionSelectedIndex

                if (isSelected && sessionRenameMode) {
                    return (
                        <Box key={session.id} flexDirection="row">
                            <Box width={2}>
                                <Text
                                    color={THEME.colors.brand}
                                >{`${THEME.glyphs.selector} `}</Text>
                            </Box>
                            <TextInput
                                value={sessionNewName}
                                onChange={setSessionNewName}
                                onSubmit={handleRenameSubmit}
                                focus={true}
                            />
                        </Box>
                    )
                }

                const isCustomName = !session.id.startsWith('session-')
                const rawTitle = isCustomName ? session.id : session.preview || session.id
                const singleLineTitle = (rawTitle || '').replace(/\s+/g, ' ').trim()
                const title =
                    singleLineTitle.length > availableWidth
                        ? singleLineTitle.slice(0, availableWidth - 3) + '...'
                        : singleLineTitle
                const timeStr = timeAgo(session.updatedAt).padStart(12)

                return (
                    <Box key={session.id} flexDirection="row">
                        <Box width={2}>
                            <Text color={isSelected ? THEME.colors.brand : THEME.colors.muted}>
                                {isSelected ? `${THEME.glyphs.selector} ` : '  '}
                            </Text>
                        </Box>
                        <Box width={availableWidth}>
                            <Text
                                color={isSelected ? THEME.colors.brand : THEME.colors.muted}
                                wrap="truncate"
                            >
                                {title}
                            </Text>
                        </Box>
                        <Box width={timeWidth}>
                            <Text color={THEME.colors.muted}>{timeStr}</Text>
                        </Box>
                    </Box>
                )
            })}

            {totalItems === 0 && (
                <Box paddingLeft={2}>
                    <Text color={THEME.colors.muted}>No sessions found.</Text>
                </Box>
            )}

            {totalItems > 0 && (
                <Box marginTop={1} paddingLeft={2}>
                    <Text color={THEME.colors.muted}>
                        [{startIndex + 1}-{Math.min(startIndex + SESSION_PAGE_SIZE, totalItems)} of{' '}
                        {totalItems} items]
                    </Text>
                </Box>
            )}

            <MenuFooter items={footerItems} />
        </Box>
    )
}
