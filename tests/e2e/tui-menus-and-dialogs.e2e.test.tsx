import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { CommandMenu } from '../../packages/tui/src/components/command-menu'
import { AskQuestionMenu } from '../../packages/tui/src/components/menus/ask-question-menu'
import { SessionSelectMenu } from '../../packages/tui/src/components/menus/session-select-menu'
import { ToolPermissionMenu } from '../../packages/tui/src/components/menus/tool-permission-menu'
import { renderWithProviders } from '../../packages/tui/test/test-providers'

describe('TUI Dialogs, Modals & Menu Flows E2E Tests', () => {
    it('handles interactive ToolPermissionMenu with diff preview and instant key approvals', () => {
        const onCompleteMock = mock()
        const toolCall = {
            name: 'write_file',
            input: { filePath: '/src/auth/service.ts' },
            diff: '@@ -1,2 +1,3 @@\n export const config = true;\n+export const superadmin = true;\n',
        }

        const { lastFrame, stdin, unmount } = renderWithProviders(
            <ToolPermissionMenu toolCall={toolCall} onComplete={onCompleteMock} />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Tool Permission Required:')
        expect(frame).toContain('write_file: /src/auth/service.ts')
        expect(frame).toContain('export const superadmin = true;')
        expect(frame).toContain('Approve')
        expect(frame).toContain('Always allow in session')
        expect(frame).toContain('Deny')

        // Instant approve via 'y' key
        stdin.write('y')
        expect(onCompleteMock).toHaveBeenCalledWith({ block: false })

        unmount()
    })

    it('handles AskQuestionMenu multi-choice checkbox selection and submission', () => {
        const onCompleteMock = mock()
        const questions = [
            {
                question: 'Select cloud features to deploy:',
                options: ['Redis Cache', 'Postgres Database', 'S3 Storage'],
                is_multi_select: true,
            },
        ]

        const { lastFrame, stdin, unmount } = renderWithProviders(
            <AskQuestionMenu questions={questions} onComplete={onCompleteMock} />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select cloud features to deploy:')
        expect(frame).toContain('Redis Cache')
        expect(frame).toContain('Postgres Database')
        expect(frame).toContain('S3 Storage')

        // Toggle Redis Cache (option 1)
        stdin.write(' ')
        // Down arrow to Postgres Database
        stdin.write('\u001B[B')
        // Toggle Postgres Database (option 2)
        stdin.write(' ')
        // Submit on Enter
        stdin.write('\r')

        expect(onCompleteMock).toHaveBeenCalledWith(['Redis Cache', 'Postgres Database'])
        unmount()
    })

    it('renders CommandMenu and displays matching slash commands', () => {
        const onSelectMock = mock()
        const onExecuteMock = mock()

        const { lastFrame, unmount } = renderWithProviders(
            <CommandMenu
                query="p"
                selectedIndex={0}
                windowStart={0}
                totalFiltered={1}
                onSelect={onSelectMock}
                onExecute={onExecuteMock}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('/plan')

        unmount()
    })

    it('renders SessionSelectMenu in navigation mode with filter and action hotkeys', () => {
        const mockSessions = [
            {
                id: 'session-auth-fix',
                preview: 'Fix JWT expiration handling',
                updatedAt: new Date(),
                messageCount: 5,
            },
            {
                id: 'session-db-schema',
                preview: 'Migrate users table',
                updatedAt: new Date(),
                messageCount: 12,
            },
        ]

        const { lastFrame, unmount } = renderWithProviders(
            <SessionSelectMenu
                sessionsData={mockSessions as any}
                handleSessionSelect={mock()}
                setSessionsData={mock()}
                setSessionSelectedIndex={mock()}
                setSessionPage={mock()}
                setSessionRenameMode={mock()}
                setSessionNewName={mock()}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Sessions')
        expect(frame).toContain('Fix JWT expiration handling')
        expect(frame).toContain('Migrate users table')
        expect(frame).toContain('/ to filter')

        unmount()
    })
})
