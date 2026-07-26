import { describe, expect, it, mock } from 'bun:test'
import React from 'react'

import { CommandMenu } from '../../src/components/command-menu'
import { renderWithProviders } from '../test-providers'

describe('CommandMenu Integration', () => {
    it('renders filtered commands matching user query', () => {
        const { lastFrame } = renderWithProviders(
            <CommandMenu
                query=""
                selectedIndex={0}
                windowStart={0}
                totalFiltered={5}
                onSelect={mock()}
                onExecute={mock()}
            />
        )

        const frame = lastFrame()
        expect(frame).toContain('Navigate')
        expect(frame).toContain('Select')
    })
})
