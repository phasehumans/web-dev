import { describe, expect, it, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { TextArea } from '../../src/components/text-area'

describe('TextArea Component (Unit)', () => {
    it('renders with placeholder text', () => {
        const { lastFrame } = render(
            <TextArea
                value=""
                onChange={() => {}}
                onSubmit={() => {}}
                placeholder="Type your message..."
            />
        )
        expect(lastFrame()).toContain('Type your message...')
    })

    it('renders value when provided', () => {
        const { lastFrame } = render(
            <TextArea value="User typed content" onChange={() => {}} onSubmit={() => {}} />
        )
        expect(lastFrame()).toContain('User typed content')
    })

    it('highlights slash commands and arguments separately', () => {
        const { lastFrame } = render(
            <TextArea value="/model gemini-3.6-flash" onChange={() => {}} onSubmit={() => {}} />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('/model')
        expect(frame).toContain('gemini-3.6-flash')
    })

    it('highlights standalone @ and @filename mentions', () => {
        const { lastFrame } = render(
            <TextArea value="check @src/app.tsx please" onChange={() => {}} onSubmit={() => {}} />
        )
        const frame = lastFrame() || ''
        expect(frame).toContain('@src/app.tsx')
        expect(frame).toContain('please')
    })

    it('highlights ? shortcuts character in brand color', () => {
        const { lastFrame } = render(<TextArea value="?" onChange={() => {}} onSubmit={() => {}} />)
        const frame = lastFrame() || ''
        expect(frame).toContain('?')
    })

    it('positions cursor at the end when value is updated via autocomplete', () => {
        const { lastFrame, rerender } = render(
            <TextArea value="/mod" onChange={() => {}} onSubmit={() => {}} />
        )
        expect(lastFrame()).toContain('/mod')

        // Autocomplete to '/model '
        rerender(<TextArea value="/model " onChange={() => {}} onSubmit={() => {}} />)
        const frame = lastFrame() || ''
        expect(frame).toContain('/model')
    })

    it('respects disableHistoryNav prop and ignores up arrow when dropdown is open', () => {
        const onHistoryUp = mock()
        const { stdin } = render(
            <TextArea
                value="/"
                onChange={() => {}}
                onSubmit={() => {}}
                onHistoryUp={onHistoryUp}
                disableHistoryNav={true}
            />
        )

        stdin.write('\u001B[A') // Up arrow
        expect(onHistoryUp).not.toHaveBeenCalled()
    })
})
