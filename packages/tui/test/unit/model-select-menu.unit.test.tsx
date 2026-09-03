import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { ModelSelectMenu } from '../../src/components/menus/model-select-menu'
import { KeyboardLayerProvider } from '../../src/providers/keyboard-layer'

describe('ModelSelectMenu Component (Unit)', () => {
    const mockModels = [
        { label: 'GPT-5.6 Sol', value: 'gpt-5.6-sol' },
        { label: 'GPT-5.6 Terra', value: 'gpt-5.6-terra' },
        { label: 'GPT-5.6 Luna', value: 'gpt-5.6-luna' },
        { label: 'GPT-5.5 Pro', value: 'gpt-5.5-pro' },
        { label: 'GPT-5.5', value: 'gpt-5.5' },
        { label: 'GPT-5.4 Pro', value: 'gpt-5.4-pro' },
        { label: 'GPT-5.4 Mini', value: 'gpt-5.4-mini' },
        { label: 'o4-mini', value: 'o4-mini' },
        { label: 'o3-pro', value: 'o3-pro' },
        { label: 'o3', value: 'o3' },
    ]

    it('renders 7 visible items with down more indicator when models > 7', () => {
        const handleSelect = mock(() => {})
        const { lastFrame } = render(
            <KeyboardLayerProvider>
                <ModelSelectMenu
                    selectedProvider="openai"
                    items={mockModels}
                    handleModelSelect={handleSelect}
                />
            </KeyboardLayerProvider>
        )

        const frame = lastFrame() || ''
        expect(frame).toContain('Select Model:')
        expect(frame).toContain('GPT-5.6 Sol')
        expect(frame).toContain('GPT-5.6 Terra')
        expect(frame).toContain('GPT-5.4 Mini')
        expect(frame).toContain('↓ 3 more')
    })

    it('navigates with arrow keys and shifts window', async () => {
        let selectedItem: any = null
        const handleSelect = (item: any) => {
            selectedItem = item
        }

        const { stdin, lastFrame } = render(
            <KeyboardLayerProvider>
                <ModelSelectMenu
                    selectedProvider="openai"
                    items={mockModels}
                    handleModelSelect={handleSelect}
                />
            </KeyboardLayerProvider>
        )

        expect(lastFrame()).toContain('❭ GPT-5.6 Sol')

        // Move down 7 times to shift window
        for (let i = 0; i < 7; i++) {
            stdin.write('\u001B[B') // Down arrow
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const frameAfterScroll = lastFrame() || ''
        expect(frameAfterScroll).toContain('↑ 1 more')
        expect(frameAfterScroll).toContain('o4-mini')

        // Press Enter to select
        stdin.write('\r')
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(selectedItem?.value).toBe('o4-mini')
    })

    it('handles esc key to exit', async () => {
        const setAuthMode = mock()

        const { stdin } = render(
            <KeyboardLayerProvider>
                <ModelSelectMenu
                    selectedProvider="openai"
                    items={mockModels}
                    handleModelSelect={() => {}}
                    setAuthMode={setAuthMode}
                />
            </KeyboardLayerProvider>
        )

        stdin.write('\x1B') // ESC key
        await new Promise((resolve) => setTimeout(resolve, 50))
        expect(setAuthMode).toHaveBeenCalledWith('none')
    })
})
