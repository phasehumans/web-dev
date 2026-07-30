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

    it('renders completed thought blocks auto-collapsed to 2-line preview without emojis or hint text', () => {
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
        expect(frame).toContain('Thought process')
        expect(frame).toContain('Line 1: Planning search')
        expect(frame).toContain('Line 2: Locating files')
        expect(frame).not.toContain('Line 4: Done')
        expect(frame).not.toContain('💭')
        expect(frame).not.toContain('Enter to expand')
    })

    it('renders active streaming thought blocks fully expanded', () => {
        const thoughtContent =
            'Line 1: Planning search\nLine 2: Locating files\nLine 3: Reading contents\nLine 4: Still thinking'
        const { lastFrame } = render(
            <BotMessage
                blocks={[{ type: 'thinking', content: thoughtContent, isStreaming: true } as any]}
            />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('Thought process... ')
        expect(frame).toContain('Line 4: Still thinking')
    })
})
