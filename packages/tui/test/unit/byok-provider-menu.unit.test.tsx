import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import {
    ByokProviderMenu,
    PROVIDER_MENU_ITEMS,
} from '../../src/components/menus/byok-provider-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

describe('ByokProviderMenu Component (Unit)', () => {
    it('has 26 total API key and local provider items without subscriptions', () => {
        expect(PROVIDER_MENU_ITEMS.length).toBe(26)
        expect(PROVIDER_MENU_ITEMS[0].value).toBe('agentrouter')
        expect(PROVIDER_MENU_ITEMS[1].value).toBe('anthropic')
        expect(PROVIDER_MENU_ITEMS[2].value).toBe('cerebras')
        expect(PROVIDER_MENU_ITEMS[3].value).toBe('cohere')
    })

    it('renders 7 visible items with down more indicator initially', () => {
        const handleSelect = mock(() => {})
        const { lastFrame } = render(
            <KeyboardLayerProvider>
                <ByokProviderMenu handleProviderSelect={handleSelect} />
            </KeyboardLayerProvider>
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select API Provider (BYOK):')
        expect(frame).toContain('AgentRouter')
        expect(frame).toContain('Anthropic')
        expect(frame).toContain('Cerebras')
        expect(frame).toContain('Cohere')
        expect(frame).toContain('DeepSeek')
        expect(frame).toContain('Fireworks AI')
        expect(frame).toContain('Google AI Studio')
        expect(frame).toContain('↓ 19 more')
    })

    it('navigates through items with arrow keys and updates more indicators', async () => {
        let selectedItem: any = null
        const handleSelect = (item: any) => {
            selectedItem = item
        }

        const { stdin, lastFrame } = render(
            <KeyboardLayerProvider>
                <ByokProviderMenu handleProviderSelect={handleSelect} />
            </KeyboardLayerProvider>
        )

        expect(lastFrame()).toContain('❭ AgentRouter')

        // Move down 7 times to shift window
        for (let i = 0; i < 7; i++) {
            stdin.write('\u001B[B') // Down arrow
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const frameAfterScroll = lastFrame() || ''
        expect(frameAfterScroll).toContain('↑ 1 more')
        expect(frameAfterScroll).toContain('↓ 18 more')

        // Press Enter to select current item (Groq)
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(selectedItem).toBeDefined()
        expect(selectedItem?.value).toBe('groq')
    })
})
