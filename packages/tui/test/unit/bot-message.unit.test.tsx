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

    it('renders completed thought blocks auto-collapsed to Thoughts (tokens) summary', () => {
        const thoughtContent =
            'Line 1: Planning search\nLine 2: Locating files\nLine 3: Reading contents\nLine 4: Done'
        const { lastFrame } = render(
            <BotMessage
                blocks={[
                    { type: 'thinking', content: thoughtContent },
                    { type: 'text', content: 'Final answer' },
                ]}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Thoughts (20 tokens)')
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

    it('renders git diff outputs collapsed by default and expands on Ctrl+O', async () => {
        const diffOutput = '--- a/file.ts\n+++ b/file.ts\n@@ -1,2 +1,2 @@\n-old code\n+new code'
        const { lastFrame, stdin } = render(
            <BotMessage
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
        expect(frame).toContain('5 lines · Ctrl+O to expand')

        // Send Ctrl+O keystroke (\x0f) to expand
        stdin.write('\x0f')
        await new Promise((resolve) => setTimeout(resolve, 50))

        frame = lastFrame() || ''
        expect(frame).toContain('5 lines · Ctrl+O to collapse')
        expect(frame).toContain('-old code')
        expect(frame).toContain('+new code')
    })
})
