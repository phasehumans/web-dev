import { describe, expect, it, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { InputBar } from '../../src/components/input-bar'
import { RootLayout } from '../../src/layouts/root-layout'

describe('InputBar Component (Unit)', () => {
    it('renders placeholder text and active model in initial state', () => {
        const handleSubmit = mock(() => {})
        const { lastFrame } = render(
            <RootLayout>
                <InputBar
                    onSubmit={handleSubmit}
                    placeholder="Ask December to build..."
                    activeModel="gemini-3.6-flash"
                />
            </RootLayout>
        )
        const frame = lastFrame()
        expect(frame).toContain('Ask December to build...')
        expect(frame).toContain('gemini-3.6-flash')
    })

    it('renders disabled state when disabled prop is true', () => {
        const handleSubmit = mock(() => {})
        const { lastFrame } = render(
            <RootLayout>
                <InputBar onSubmit={handleSubmit} disabled={true} placeholder="Input disabled" />
            </RootLayout>
        )
        const frame = lastFrame()
        expect(frame).toContain('Input disabled')
    })

    it('renders exit confirmation prompt when showExitConfirm is true', () => {
        const handleSubmit = mock(() => {})
        const { lastFrame } = render(
            <RootLayout>
                <InputBar onSubmit={handleSubmit} showExitConfirm={true} />
            </RootLayout>
        )
        const frame = lastFrame()
        expect(frame).toContain('Press Ctrl+C again to exit')
    })
})
