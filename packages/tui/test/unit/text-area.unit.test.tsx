import { describe, expect, it } from 'bun:test'
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
})
