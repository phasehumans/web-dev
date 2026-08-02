import { describe, expect, it } from 'bun:test'
import React from 'react'

import { MessageList } from '../../src/components/message-list'
import { renderWithProviders } from '../test-providers'

describe('MessageList Component (Unit)', () => {
    it('renders static and active messages correctly', () => {
        const staticMessages = [
            { id: 'h1', role: 'header' as const },
            { id: 'u1', role: 'user' as const, text: 'Hello AI' },
            {
                id: 'b1',
                role: 'assistant' as const,
                blocks: [{ type: 'text' as const, content: 'Hello User!' }],
            },
        ]

        const activeMessages = [
            {
                id: 'b2',
                role: 'assistant' as const,
                blocks: [{ type: 'text' as const, content: 'Streaming response...' }],
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={activeMessages}
                isAuthenticated={true}
                cliVersion="0.2.20"
                userEmail="test@example.com"
            />
        )

        const frame = lastFrame()
        expect(frame).toContain('December CLI')
        expect(frame).toContain('Hello AI')
        expect(frame).toContain('Hello User!')
        expect(frame).toContain('Streaming response...')
    })

    it('renders error messages correctly in static and active list', () => {
        const staticMessages = [
            { id: 'e1', role: 'error' as const, text: 'API rate limit exceeded' },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
            />
        )

        const frame = lastFrame()
        expect(frame).toContain('API rate limit exceeded')
    })

    it('renders header banner on session resume and passes expandCommands to past messages', () => {
        const staticMessages = [
            { id: 'header', role: 'header' as const },
            {
                id: 'past-cmd',
                role: 'assistant' as const,
                blocks: [
                    {
                        type: 'command' as const,
                        command: 'git status',
                        output: 'On branch main\nnothing to commit',
                        status: 'success' as const,
                    },
                ],
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={1}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
                cliVersion="0.2.24"
                expandCommands={true}
            />
        )

        const frame = lastFrame()
        expect(frame).toContain('December CLI 0.2.24')
        expect(frame).toContain('Tips for getting started')
        expect(frame).toContain('git status')
        expect(frame).toContain('On branch main')
    })
})
