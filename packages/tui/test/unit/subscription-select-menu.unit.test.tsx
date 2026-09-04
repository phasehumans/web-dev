import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import {
    SubscriptionSelectMenu,
    SUBSCRIPTION_MENU_ITEMS,
} from '../../src/components/menus/subscription-select-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

describe('SubscriptionSelectMenu Component (Unit)', () => {
    it('has 4 subscription items', () => {
        expect(SUBSCRIPTION_MENU_ITEMS.length).toBe(4)
        expect(SUBSCRIPTION_MENU_ITEMS[0].value).toBe('claude')
        expect(SUBSCRIPTION_MENU_ITEMS[1].value).toBe('copilot')
        expect(SUBSCRIPTION_MENU_ITEMS[2].value).toBe('gemini')
        expect(SUBSCRIPTION_MENU_ITEMS[3].value).toBe('codex')
    })

    it('renders all subscriptions', () => {
        const handleSelect = mock(() => {})
        const { lastFrame } = render(
            <KeyboardLayerProvider>
                <SubscriptionSelectMenu handleSubscriptionSelect={handleSelect} />
            </KeyboardLayerProvider>
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select AI Subscription Provider:')
        expect(frame).toContain('Anthropic (Claude)')
        expect(frame).not.toContain('[detected locally]')
        expect(frame).toContain('GitHub (Copilot)')
        expect(frame).toContain('Google (Gemini / Antigravity)')
        expect(frame).not.toContain('[connect]')
        expect(frame).toContain('OpenAI (ChatGPT)')
    })

    it('navigates with arrows and selects subscription', async () => {
        let selectedItem: any = null
        const handleSelect = (item: any) => {
            selectedItem = item
        }

        const { stdin, lastFrame } = render(
            <KeyboardLayerProvider>
                <SubscriptionSelectMenu handleSubscriptionSelect={handleSelect} />
            </KeyboardLayerProvider>
        )

        expect(lastFrame()).toContain('❭ Anthropic (Claude)')

        // Down arrow to GitHub
        stdin.write('\u001B[B')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(lastFrame()).toContain('❭ GitHub (Copilot)')

        // Press Enter
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(selectedItem).toBeDefined()
        expect(selectedItem?.value).toBe('copilot')
    })
})
