import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { describe, it, expect, afterEach } from 'bun:test'
import React from 'react'

import { TerminalWorkspace } from '../src/features/preview/components/TerminalWorkspace'

if (!globalThis.document) {
    GlobalRegistrator.register()
}

// Mock ResizeObserver for jsdom/happy-dom environment
if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as any
}

const { render, screen, cleanup, fireEvent, waitFor } = await import('@testing-library/react')

afterEach(() => {
    cleanup()
})

describe('Ticket #402: Terminal Workspace Connection Status and Shell Cleanup', () => {
    it('renders clear informative status state when no runtime container is available', () => {
        render(<TerminalWorkspace previewSessionId={null} />)

        expect(screen.getByText('No runtime container active')).toBeDefined()
        expect(screen.getByText('Runtime Container Unavailable')).toBeDefined()
        expect(
            screen.getByText(
                /Terminal streams live I\/O when an active runtime container is running/
            )
        ).toBeDefined()
        // Ensure no virtual mock shell commands/outputs or fake system prompts are rendered
        expect(screen.queryByText('december-workspace')).toBeNull()
        expect(screen.queryByText('~/project $')).toBeNull()
    })

    it('renders connecting state when previewSessionId is provided', () => {
        render(<TerminalWorkspace previewSessionId="session-test-123" />)

        expect(screen.getByText('Connecting to runtime container...')).toBeDefined()
        // Ensure no simulated virtual filesystem
        expect(screen.queryByText('december-workspace')).toBeNull()
    })

    it('renders clear buffer button in header and handles click without error', () => {
        render(<TerminalWorkspace previewSessionId="session-test-456" />)

        const clearBtn = screen.getByTitle('Clear terminal buffer')
        expect(clearBtn).toBeDefined()
        fireEvent.click(clearBtn)
    })
})
