import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { BotMessage } from '../../src/components/messages/bot-message'

describe('BotMessage Component (Unit)', () => {
    it('renders assistant response text blocks', () => {
        const { lastFrame } = render(
            <BotMessage blocks={[{ type: 'text', content: 'Assistant response text' }]} />
        )
        expect(lastFrame()).toContain('Assistant response text')
    })

    it('renders completed thought blocks expanded by default and respects expandCommands', () => {
        const thoughtContent =
            'Line 1: Planning search\nLine 2: Locating files\nLine 3: Reading contents\nLine 4: Done'
        const { lastFrame, rerender } = render(
            <BotMessage
                expandCommands={true}
                blocks={[
                    { type: 'thinking', content: thoughtContent },
                    { type: 'text', content: 'Final answer' },
                ]}
            />
        )
        let frame = lastFrame() || ''
        expect(frame).toContain('Thoughts')
        expect(frame).toContain('20 tokens')
        expect(frame).toContain('Line 1: Planning search')

        // Re-render with expandCommands=false
        rerender(
            <BotMessage
                expandCommands={false}
                blocks={[
                    { type: 'thinking', content: thoughtContent },
                    { type: 'text', content: 'Final answer' },
                ]}
            />
        )

        frame = lastFrame() || ''
        expect(frame).toContain('Thoughts')
        expect(frame).toContain('20 tokens')
        expect(frame).not.toContain('Line 1: Planning search')
    })

    it('renders active streaming thought blocks cleanly with side border', () => {
        const thoughtContent =
            'Line 1: Planning search\nLine 2: Locating files\nLine 3: Reading contents\nLine 4: Still thinking'
        const { lastFrame } = render(
            <BotMessage
                blocks={[{ type: 'thinking', content: thoughtContent, isStreaming: true } as any]}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Line 4: Still thinking')
        expect(frame).not.toContain('Thought process')
    })

    it('renders HTTP 429 rate limit error messages correctly without badges', () => {
        const { lastFrame } = render(
            <BotMessage
                blocks={[
                    {
                        type: 'error',
                        error: 'LLM Rate Limit Reached (HTTP 429: Too Many Requests).',
                    },
                ]}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('HTTP 429')
        expect(frame).toContain('Too Many Requests')
        expect(frame).not.toContain('RATE LIMITED')
    })

    it('renders HTTP 503 provider overload error messages correctly without badges', () => {
        const { lastFrame } = render(
            <BotMessage
                blocks={[
                    { type: 'error', error: 'HTTP 503 Service Unavailable: Gemini overloaded.' },
                ]}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('HTTP 503')
        expect(frame).toContain('Gemini overloaded')
        expect(frame).not.toContain('HIGH DEMAND')
    })

    it('renders git diff outputs expanded by default and respects expandCommands', () => {
        const diffOutput = '--- a/file.ts\n+++ b/file.ts\n@@ -1,2 +1,2 @@\n-old code\n+new code'
        const { lastFrame, rerender } = render(
            <BotMessage
                expandCommands={true}
                blocks={[
                    {
                        type: 'command',
                        toolCallId: '101',
                        toolName: 'bash',
                        command: 'git diff',
                        status: 'success',
                        output: diffOutput,
                    },
                ]}
            />
        )
        let frame = lastFrame() || ''
        expect(frame).toContain('ctrl+o to collapse')
        expect(frame).toContain('-old code')
        expect(frame).toContain('+new code')

        // Re-render with expandCommands=false
        rerender(
            <BotMessage
                expandCommands={false}
                blocks={[
                    {
                        type: 'command',
                        toolCallId: '101',
                        toolName: 'bash',
                        command: 'git diff',
                        status: 'success',
                        output: diffOutput,
                    },
                ]}
            />
        )

        frame = lastFrame() || ''
        expect(frame).toContain('ctrl+o to expand')
        expect(frame).not.toContain('-old code')
    })

    it('renders multiple command blocks compactly without gaps between them', () => {
        const blocks: any[] = [
            { type: 'text', content: 'Working...' },
            {
                type: 'command',
                command: 'ListDir(/home/chaitanya/code/december)',
                status: 'success',
                output: 'dir1\ndir2',
            },
            { type: 'text', content: 'Working...' },
            {
                type: 'command',
                command: 'Create(/home/chaitanya/code/december/lion/index.html)',
                status: 'success',
                output: '+html',
            },
            { type: 'text', content: 'Working...' },
            {
                type: 'command',
                command: 'Create(/home/chaitanya/code/december/lion/styles.css)',
                status: 'success',
                output: '+css',
            },
            { type: 'text', content: 'Working...' },
            {
                type: 'command',
                command: 'Create(/home/chaitanya/code/december/lion/script.js)',
                status: 'success',
                output: '+js',
            },
            { type: 'text', content: 'Working...' },
            {
                type: 'command',
                command: 'Bash(node -c lion/script.js)',
                status: 'success',
                output: 'ok',
            },
        ]
        const { lastFrame } = render(<BotMessage blocks={blocks} expandCommands={false} />)
        const frame = lastFrame() || ''
        const lines = frame.split('\n').filter((l) => l.includes('ctrl+o to expand'))
        expect(lines.length).toBe(5)
        // Verify there are no empty lines between the 5 command lines
        const rawLines = frame.split('\n')
        const firstIdx = rawLines.findIndex((l) => l.includes('ListDir'))
        const slice = rawLines.slice(firstIdx, firstIdx + 5)
        expect(slice.every((l) => l.trim().length > 0)).toBe(true)
    })

    it('locks spacing contract: tool calls followed by text response has exactly 1 blank line margin', () => {
        const blocks: any[] = [
            {
                type: 'command',
                command: 'ListDir(/home/chaitanya/code/december)',
                status: 'success',
                output: 'ok',
            },
            {
                type: 'text',
                content: 'I have finished listing the directory.',
            },
        ]
        const { lastFrame } = render(<BotMessage blocks={blocks} expandCommands={false} />)
        const frame = lastFrame() || ''
        const rawLines = frame.split('\n')
        const cmdIdx = rawLines.findIndex((l) => l.includes('ListDir'))
        const textIdx = rawLines.findIndex((l) => l.includes('I have finished'))
        // Exactly 1 blank line between command and text (textIdx should be cmdIdx + 2)
        expect(textIdx).toBe(cmdIdx + 2)
        expect(rawLines[cmdIdx + 1]?.trim()).toBe('')
    })

    it('locks spacing contract: thoughts followed by tool calls has 0 blank lines (adjacent lines)', () => {
        const blocks: any[] = [
            {
                type: 'thinking',
                content: 'Planning next steps',
            },
            {
                type: 'command',
                command: 'ListDir(/home/chaitanya/code/december)',
                status: 'success',
                output: 'ok',
            },
        ]
        const { lastFrame } = render(<BotMessage blocks={blocks} expandCommands={false} />)
        const frame = lastFrame() || ''
        const rawLines = frame.split('\n')
        const thoughtIdx = rawLines.findIndex((l) => l.includes('Thoughts'))
        const cmdIdx = rawLines.findIndex((l) => l.includes('ListDir'))
        // 0 blank lines: cmdIdx is directly thoughtIdx + 1
        expect(cmdIdx).toBe(thoughtIdx + 1)
    })

    it('locks spacing contract: thoughts followed directly by text response has exactly 1 blank line', () => {
        const blocks: any[] = [
            {
                type: 'thinking',
                content: 'Planning next steps',
            },
            {
                type: 'text',
                content: 'Here is the answer without tools.',
            },
        ]
        const { lastFrame } = render(<BotMessage blocks={blocks} expandCommands={false} />)
        const frame = lastFrame() || ''
        const rawLines = frame.split('\n')
        const thoughtIdx = rawLines.findIndex((l) => l.includes('Thoughts'))
        const textIdx = rawLines.findIndex((l) => l.includes('Here is the answer'))
        // Exactly 1 blank line between thoughts summary and text response
        expect(textIdx).toBe(thoughtIdx + 2)
        expect(rawLines[thoughtIdx + 1]?.trim()).toBe('')
    })

    it('renders analyzing and generating questions status labels with spinner', () => {
        const { lastFrame: frame1 } = render(
            <BotMessage blocks={[{ type: 'text', content: 'Analyzing prompt...' }]} />
        )
        expect(frame1()).toContain('Analyzing prompt...')

        const { lastFrame: frame2 } = render(
            <BotMessage blocks={[{ type: 'text', content: 'Generating questions...' }]} />
        )
        expect(frame2()).toContain('Generating questions...')
    })
})
