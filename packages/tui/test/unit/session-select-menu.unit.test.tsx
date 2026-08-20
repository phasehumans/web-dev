import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { SessionSelectMenu } from '../../src/components/menus/session-select-menu'

describe('SessionSelectMenu Component (Unit)', () => {
    const mockSessions = [
        { id: 'session-1', preview: 'Build auth module', updatedAt: new Date() },
        { id: 'session-2', preview: 'Fix wallet balance', updatedAt: new Date() },
        { id: 'session-3', preview: 'Refactor database', updatedAt: new Date() },
    ]

    it('renders session list in navigation mode with [/ to filter] and Vim footer', () => {
        const { lastFrame } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={mock()}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={mock()}
            />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Sessions')
        expect(output).toContain('Build auth module')
        expect(output).toContain('Fix wallet balance')
        expect(output).toContain('[/ to filter]')
        expect(output).toContain('Navigate')
        expect(output).toContain('Search')
        expect(output).toContain('Rename')
        expect(output).toContain('Delete')
        expect(output).toContain('Cancel')
    })

    it('activates search mode on / and filters sessions live', async () => {
        const { lastFrame, stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={mock()}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={mock()}
            />
        )

        // Press '/' to enter search mode
        stdin.write('/')
        await new Promise((r) => setTimeout(r, 50))

        // Type query 'wallet'
        stdin.write('wallet')
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).toContain('Fix wallet balance')
        expect(output).not.toContain('Build auth module')
        expect(output).toContain('Focus List')
        expect(output).toContain('Exit Search')
    })

    it('exits search mode on escape without closing the menu', async () => {
        const setAuthMode = mock()
        const { lastFrame, stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={mock()}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={setAuthMode}
            />
        )

        // Enter search mode
        stdin.write('/')
        await new Promise((r) => setTimeout(r, 50))

        // Type filter query
        stdin.write('wallet')
        await new Promise((r) => setTimeout(r, 50))

        // Press Escape - should exit search mode, NOT close the menu
        stdin.write('\x1B')
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).toContain('Fix wallet balance')
        expect(output).toContain('[/ to filter]')
        expect(setAuthMode).not.toHaveBeenCalled()
    })

    it('clears query on escape when in navigation mode with filter, and closes on next escape', async () => {
        const setAuthMode = mock()
        const { lastFrame, stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={mock()}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={setAuthMode}
            />
        )

        // Enter search mode, type query, and exit search mode with Enter
        stdin.write('/')
        await new Promise((r) => setTimeout(r, 50))
        stdin.write('wallet')
        await new Promise((r) => setTimeout(r, 50))
        stdin.write('\r')
        await new Promise((r) => setTimeout(r, 50))

        // First escape: clears search query
        stdin.write('\x1B')
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).toContain('Build auth module')
        expect(output).toContain('Fix wallet balance')
        expect(setAuthMode).not.toHaveBeenCalled()

        // Second escape: closes session menu
        stdin.write('\x1B')
        await new Promise((r) => setTimeout(r, 50))
        expect(setAuthMode).toHaveBeenCalledWith('none')
    })

    it('enters rename mode on single "r" in navigation mode', async () => {
        const setSessionRenameMode = mock()
        const setSessionNewName = mock()
        const { stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={setSessionNewName}
                setSessionsData={mock()}
                setSessionRenameMode={setSessionRenameMode}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={mock()}
            />
        )

        stdin.write('r') // single 'r' hotkey
        await new Promise((r) => setTimeout(r, 50))

        expect(setSessionNewName).toHaveBeenCalledWith('session-1')
        expect(setSessionRenameMode).toHaveBeenCalledWith(true)
    })

    it('deletes session immediately on single "d" in navigation mode without confirmation prompt', async () => {
        const deleteSessionMock = mock(() => Promise.resolve())
        const setSessionsData = mock()
        const { lastFrame, stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={setSessionsData}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={mock()}
                sessionRepository={{ deleteSession: deleteSessionMock }}
            />
        )

        stdin.write('d') // single 'd' hotkey
        await new Promise((r) => setTimeout(r, 50))

        const output = lastFrame() || ''
        expect(output).not.toContain('Delete session "session-1"?')
        expect(deleteSessionMock).toHaveBeenCalledWith('session-1')
        expect(setSessionsData).toHaveBeenCalled()
    })

    it('navigates sessions with j and k keys in navigation mode', async () => {
        const setSessionSelectedIndex = mock()
        const { stdin } = render(
            <SessionSelectMenu
                sessionsData={mockSessions}
                sessionPage={0}
                sessionSelectedIndex={0}
                sessionRenameMode={false}
                sessionNewName=""
                setSessionNewName={mock()}
                setSessionsData={mock()}
                setSessionRenameMode={mock()}
                setSessionSelectedIndex={setSessionSelectedIndex}
                setSessionPage={mock()}
                handleSessionSelect={mock()}
                setAuthMode={mock()}
            />
        )

        stdin.write('j') // down
        await new Promise((r) => setTimeout(r, 50))

        expect(setSessionSelectedIndex).toHaveBeenCalledWith(1)
    })
})
