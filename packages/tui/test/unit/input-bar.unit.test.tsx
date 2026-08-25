import { describe, expect, it, mock } from 'bun:test'
import { Text } from 'ink'
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

    it('navigates slash command menu with up and down arrows in InputBar', async () => {
        const handleSubmit = mock(() => {})
        const { stdin, lastFrame } = render(
            <RootLayout>
                <InputBar onSubmit={handleSubmit} />
            </RootLayout>
        )

        stdin.write('/')
        await new Promise((resolve) => setTimeout(resolve, 20))
        expect(lastFrame()).toContain('❭ /clear')

        stdin.write('\u001B[B') // Down
        await new Promise((resolve) => setTimeout(resolve, 20))
        expect(lastFrame()).toContain('❭ /context')

        stdin.write('\u001B[A') // Up
        await new Promise((resolve) => setTimeout(resolve, 20))
        expect(lastFrame()).toContain('❭ /clear')
    })

    it('suppresses prompt separators and prompt glyph when authUI is provided', () => {
        const handleSubmit = mock(() => {})
        const { lastFrame } = render(
            <RootLayout>
                <InputBar
                    onSubmit={handleSubmit}
                    placeholder="Ask December to build..."
                    activeModel="gemini-3.6-flash"
                    authUI={<Text>Active Menu Content</Text>}
                />
            </RootLayout>
        )
        const frame = lastFrame()
        expect(frame).toContain('Active Menu Content')
        expect(frame).not.toContain('Ask December to build...')
        expect(frame).not.toContain('gemini-3.6-flash')
        expect(frame).not.toContain('? for shortcuts')
    })
})
