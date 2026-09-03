import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import {
    ByokProviderMenu,
    PROVIDER_MENU_ITEMS,
} from '../../src/components/menus/byok-provider-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

describe('ByokProviderMenu Component (Unit)', () => {
    it('has 22 total API key and local provider items without subscriptions', () => {
        expect(PROVIDER_MENU_ITEMS.length).toBe(22)
        expect(PROVIDER_MENU_ITEMS[0].value).toBe('anthropic')
        expect(PROVIDER_MENU_ITEMS[1].value).toBe('openai')
        expect(PROVIDER_MENU_ITEMS[2].value).toBe('google')
        expect(PROVIDER_MENU_ITEMS[3].value).toBe('openrouter')
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
        expect(frame).toContain('Anthropic')
        expect(frame).toContain('OpenAI')
        expect(frame).toContain('Google AI Studio')
        expect(frame).toContain('OpenRouter')
        expect(frame).toContain('DeepSeek')
        expect(frame).toContain('Groq')
        expect(frame).toContain('Ollama')
        expect(frame).toContain('↓ 15 more')
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

        expect(lastFrame()).toContain('❭ Anthropic')

        // Move down 7 times to shift window
        for (let i = 0; i < 7; i++) {
            stdin.write('\u001B[B') // Down arrow
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const frameAfterScroll = lastFrame() || ''
        expect(frameAfterScroll).toContain('↑ 1 more')
        expect(frameAfterScroll).toContain('↓ 14 more')

        // Press Enter to select current item (AgentRouter)
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(selectedItem).toBeDefined()
        expect(selectedItem?.value).toBe('agentrouter')
    })
})
