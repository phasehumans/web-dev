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
        expect(SUBSCRIPTION_MENU_ITEMS[0].value).toBe('copilot')
        expect(SUBSCRIPTION_MENU_ITEMS[1].value).toBe('claude')
        expect(SUBSCRIPTION_MENU_ITEMS[2].value).toBe('codex')
        expect(SUBSCRIPTION_MENU_ITEMS[3].value).toBe('gemini')
    })

    it('renders all subscriptions and displays detected badge when passed', () => {
        const handleSelect = mock(() => {})
        const { lastFrame } = render(
            <KeyboardLayerProvider>
                <SubscriptionSelectMenu
                    handleSubscriptionSelect={handleSelect}
                    detectedSubscriptions={{ copilot: true, claude: true }}
                />
            </KeyboardLayerProvider>
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select AI Subscription Provider:')
        expect(frame).toContain('GitHub Copilot')
        expect(frame).toContain('[detected locally]')
        expect(frame).toContain('Claude Code (Anthropic)')
        expect(frame).toContain('ChatGPT Plus / Team / Pro (OpenAI)')
        expect(frame).toContain('[connect]')
        expect(frame).toContain('Google Gemini / Antigravity')
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

        expect(lastFrame()).toContain('❭ GitHub Copilot')

        // Down arrow to Claude
        stdin.write('\u001B[B')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(lastFrame()).toContain('❭ Claude Code')

        // Press Enter
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(selectedItem).toBeDefined()
        expect(selectedItem?.value).toBe('claude')
    })
})
