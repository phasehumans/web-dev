import { describe, expect, it } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { Pill } from '../../src/components/pill'

describe('Pill Component (Unit)', () => {
    it('renders with label content', () => {
        const { lastFrame } = render(<Pill label="STATUS" />)
        expect(lastFrame()).toContain('STATUS')
    })
})
