import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { expect, test, describe, mock, afterEach } from 'bun:test'
import React from 'react'

import { SessionListRow } from '../src/features/sessions/components/SessionListRow'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('SessionListRow Mobile CRUD Interactions', () => {
    const sampleSession = {
        id: 'session-123',
        title: 'Test Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: 'Hello world',
        tags: ['React'],
        isArchived: false,
    }

    test('mobile menu triggers rename, tags, archive, and delete callbacks', () => {
        const onOpenRename = mock()
        const onOpenTags = mock()
        const onToggleArchiveFromMenu = mock()
        const onOpenDelete = mock()
        const onOpenProjectFromMenu = mock()
        const onToggleMenu = mock()

        render(
            <SessionListRow
                project={sampleSession}
                isMenuOpen={true}
                isTogglePending={false}
                onOpenProject={mock()}
                onToggleStar={mock()}
                onToggleMenu={onToggleMenu}
                onOpenProjectFromMenu={onOpenProjectFromMenu}
                onToggleStarFromMenu={mock()}
                onToggleArchiveFromMenu={onToggleArchiveFromMenu}
                onOpenRename={onOpenRename}
                onOpenDelete={onOpenDelete}
                onOpenTags={onOpenTags}
            />
        )

        // Verify Insights button is removed
        expect(screen.queryByRole('button', { name: /Insights/i })).toBeNull()

        // Multiple buttons with text "Rename" exist (mobile + desktop)
        const renameButtons = screen.getAllByRole('button', { name: /Rename/i })
        expect(renameButtons.length).toBe(2)

        // Fire mousedown followed by click on mobile rename button (first one rendered)
        fireEvent.mouseDown(renameButtons[0])
        fireEvent.click(renameButtons[0])
        expect(onOpenRename).toHaveBeenCalled()

        // Fire mousedown and click on mobile tags button
        const tagButtons = screen.getAllByRole('button', { name: /Tags/i })
        fireEvent.mouseDown(tagButtons[0])
        fireEvent.click(tagButtons[0])
        expect(onOpenTags).toHaveBeenCalled()

        // Fire mousedown and click on mobile archive button
        const archiveButtons = screen.getAllByRole('button', { name: /Archive/i })
        fireEvent.mouseDown(archiveButtons[0])
        fireEvent.click(archiveButtons[0])
        expect(onToggleArchiveFromMenu).toHaveBeenCalled()

        // Fire mousedown and click on mobile delete button
        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
        fireEvent.mouseDown(deleteButtons[0])
        fireEvent.click(deleteButtons[0])
        expect(onOpenDelete).toHaveBeenCalled()
    })
})
