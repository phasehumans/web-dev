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

    it('renders consecutive assistant tool call messages compactly without gaps', () => {
        const staticMessages = [
            {
                id: 'cmd-1',
                role: 'assistant' as const,
                blocks: [
                    {
                        type: 'command' as const,
                        command: 'ListDir(/root)',
                        output: 'ok',
                        status: 'success' as const,
                    },
                ],
            },
            {
                id: 'cmd-2',
                role: 'assistant' as const,
                blocks: [
                    {
                        type: 'command' as const,
                        command: 'Create(/root/index.html)',
                        output: 'ok',
                        status: 'success' as const,
                    },
                ],
            },
            {
                id: 'cmd-3',
                role: 'assistant' as const,
                blocks: [
                    {
                        type: 'command' as const,
                        command: 'Bash(npm test)',
                        output: 'ok',
                        status: 'success' as const,
                    },
                ],
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
                expandCommands={false}
            />
        )

        const frame = lastFrame() || ''
        const rawLines = frame.split('\n')
        const firstIdx = rawLines.findIndex((l) => l.includes('ListDir'))
        const slice = rawLines.slice(firstIdx, firstIdx + 3)
        expect(slice.every((l) => l.trim().length > 0)).toBe(true)
        expect(slice.length).toBe(3)
    })

    it('locks spacing contract: multi-turn conversation maintains 1-line margin between turns', () => {
        const staticMessages = [
            { id: 'u1', role: 'user' as const, text: 'First user prompt' },
            {
                id: 'b1',
                role: 'assistant' as const,
                blocks: [{ type: 'text' as const, content: 'First assistant response' }],
            },
            { id: 'u2', role: 'user' as const, text: 'Second user prompt' },
            {
                id: 'b2',
                role: 'assistant' as const,
                blocks: [{ type: 'text' as const, content: 'Second assistant response' }],
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
            />
        )

        const frame = lastFrame() || ''
        const rawLines = frame.split('\n')
        const u1Idx = rawLines.findIndex((l) => l.includes('First user prompt'))
        const b1Idx = rawLines.findIndex((l) => l.includes('First assistant response'))
        const u2Idx = rawLines.findIndex((l) => l.includes('Second user prompt'))
        const b2Idx = rawLines.findIndex((l) => l.includes('Second assistant response'))

        // User 1 to Bot 1: exactly 1 blank line
        expect(b1Idx).toBe(u1Idx + 2)
        expect(rawLines[u1Idx + 1]?.trim()).toBe('')

        // Bot 1 to User 2: exactly 1 blank line
        expect(u2Idx).toBe(b1Idx + 2)
        expect(rawLines[b1Idx + 1]?.trim()).toBe('')

        // User 2 to Bot 2: exactly 1 blank line
        expect(b2Idx).toBe(u2Idx + 2)
        expect(rawLines[u2Idx + 1]?.trim()).toBe('')
    })

    it('renders displayText over text when displayText is provided', () => {
        const staticMessages = [
            {
                id: 'u1',
                role: 'user' as const,
                text: 'Full expanded prompt with hundreds of lines of context',
                displayText: '/skill:implement',
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('/skill:implement')
        expect(frame).not.toContain('Full expanded prompt')
    })

    it('sanitizes [Skill Invocation: /<cmd>] header and does not render entire skill body', () => {
        const fullSkillPrompt = `[Skill Invocation: /ask-matt] (Skill Directory: /home/chaitanya/.agents/skills/ask-matt)\n\nPlease follow the procedures from skill 'ask-matt':\n\n# Ask Matt\n\nYou don't remember every skill, so ask.`

        const staticMessages = [
            {
                id: 'u1',
                role: 'user' as const,
                text: fullSkillPrompt,
            },
        ]

        const { lastFrame } = renderWithProviders(
            <MessageList
                staticKey={0}
                staticMessages={staticMessages}
                activeMessages={[]}
                isAuthenticated={true}
            />
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('/ask-matt')
        expect(frame).not.toContain('Please follow the procedures from skill')
        expect(frame).not.toContain("You don't remember every skill, so ask.")
    })
})
