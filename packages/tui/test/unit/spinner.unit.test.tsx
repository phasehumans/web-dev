import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { Spinner } from '../../src/components/spinner'

describe('Spinner Component (Unit)', () => {
    it('renders with label text', () => {
        const { lastFrame } = render(<Spinner label="Loading..." />)
        expect(lastFrame()).toContain('Loading...')
    })
})
