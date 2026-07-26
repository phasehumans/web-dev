import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { Header } from '../../src/components/header'

describe('Header Component (Unit)', () => {
    it('renders with default version', () => {
        const { lastFrame } = render(<Header />)
        const frame = lastFrame()
        expect(frame).toContain('December CLI')
    })

    it('renders with custom version and email', () => {
        const { lastFrame } = render(<Header cliVersion="1.0.0" userEmail="test@example.com" />)
        const frame = lastFrame()
        expect(frame).toContain('1.0.0')
        expect(frame).toContain('test@example.com')
    })
})
