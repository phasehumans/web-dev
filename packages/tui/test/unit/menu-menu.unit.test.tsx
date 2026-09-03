import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { MenuMenu } from '../../src/components/menus/menu-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

describe('MenuMenu Component (Unit)', () => {
    it('renders all 3 authentication method options', () => {
        const { lastFrame } = render(
            <KeyboardLayerProvider>
                <MenuMenu />
            </KeyboardLayerProvider>
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select authentication method:')
        expect(frame).toContain('Bring Your Own Key')
        expect(frame).toContain('Use AI Subscription')
        expect(frame).toContain('Login via December')
    })

    it('navigates with arrows and selects option', async () => {
        let selectedItem: any = null
        const handleSelect = (item: any) => {
            selectedItem = item
        }

        const { stdin, lastFrame } = render(
            <KeyboardLayerProvider>
                <MenuMenu handleAuthMenuSelect={handleSelect} />
            </KeyboardLayerProvider>
        )

        expect(lastFrame()).toContain('❭ Bring Your Own Key')

        // Down arrow to Use AI Subscription
        stdin.write('\u001B[B')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(lastFrame()).toContain('❭ Use AI Subscription')

        // Press Enter
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(selectedItem).toBeDefined()
        expect(selectedItem?.value).toBe('subscriptions')
    })

    it('cancels menu on pressing escape key', async () => {
        const setAuthMode = mock(() => {})
        const { stdin } = render(
            <KeyboardLayerProvider>
                <MenuMenu setAuthMode={setAuthMode} />
            </KeyboardLayerProvider>
        )

        stdin.write('\x1B')
        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(setAuthMode).toHaveBeenCalledWith('none')
    })
})
