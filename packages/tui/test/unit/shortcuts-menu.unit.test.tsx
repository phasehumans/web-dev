import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { ShortcutsMenu, SHORTCUTS } from '../../src/components/menus/shortcuts-menu'
import { renderWithProviders } from '../test-providers'

describe('ShortcutsMenu Component (Unit)', () => {
    it('renders all shortcuts', () => {
        const handleClose = mock()
        const { lastFrame } = renderWithProviders(<ShortcutsMenu onClose={handleClose} />)
        const frame = lastFrame()

        expect(SHORTCUTS.length).toBe(15)
        expect(frame).toContain('Open slash commands')
        expect(frame).toContain('ctrl+c')
        expect(frame).toContain('ctrl+h')
        expect(frame).toContain('ctrl+l')
        expect(frame).toContain('ctrl+o')
        expect(frame).toContain('ctrl+t')
        expect(frame).toContain('alt+enter')
    })
})
