import { describe, expect, it } from 'bun:test'
import React from 'react'

import { MessageList } from '../../src/components/message-list'
import { renderWithProviders } from '../test-providers'

describe('TUI Rendering Load Tests', () => {
    it('renders a large list of 100 chat messages without throwing or memory corruption', () => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
            id: `msg-${i}`,
            role: 'user' as const,
            text: `Message ${i}: This is automated test content ensuring high message throughput and rendering stability in terminal output buffers.`,
        }))

        const { lastFrame, unmount } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={messages as any}
                activeMessages={[]}
                isAuthenticated={true}
            />
        )

        const frame = lastFrame()
        expect(frame).toBeDefined()
        expect(frame).toContain('Message 99')
        unmount()
    })
})
