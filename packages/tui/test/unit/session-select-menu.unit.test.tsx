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

    it('renders session list with search bar and standardized footer', () => {
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
        expect(output).toContain('Navigate')
        expect(output).toContain('Select')
        expect(output).toContain('Rename')
        expect(output).toContain('Delete')
        expect(output).toContain('Cancel')
    })

    it('filters sessions live when typing query in search input', async () => {
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

        stdin.write('wallet')
        await new Promise((r) => setTimeout(r, 50))
        const output = lastFrame() || ''
        expect(output).toContain('Fix wallet balance')
        expect(output).not.toContain('Build auth module')
    })
})
