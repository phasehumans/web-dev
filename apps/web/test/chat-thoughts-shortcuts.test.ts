import { describe, it, expect, beforeEach } from 'bun:test'

import { useAppStore } from '../src/app/store'
import { parseInlineThoughtBlocks } from '../src/features/chat/utils/thoughtParser'

describe('Ticket #388: Ctrl+O Shortcuts and Thought Extraction', () => {
    beforeEach(() => {
        useAppStore.setState({
            messages: [],
            expandCommands: true,
        })
    })

    it('toggles expandCommands state globally in chat store', () => {
        expect(useAppStore.getState().expandCommands).toBe(true)

        useAppStore.getState().toggleExpandCommands()
        expect(useAppStore.getState().expandCommands).toBe(false)

        useAppStore.getState().toggleExpandCommands()
        expect(useAppStore.getState().expandCommands).toBe(true)

        useAppStore.getState().setExpandCommands(false)
        expect(useAppStore.getState().expandCommands).toBe(false)
    })

    it('extracts inline <thought> tags from text into distinct thought and text segments', () => {
        const rawContent =
            '<thought>I need to check the dependencies and install lodash</thought>I have checked package.json and will proceed with the update.'

        const segments = parseInlineThoughtBlocks(rawContent)
        expect(segments).toHaveLength(2)

        expect(segments[0]).toEqual({
            type: 'thought',
            content: 'I need to check the dependencies and install lodash',
            tokenCount: 12,
            isStreaming: false,
        })

        expect(segments[1]).toEqual({
            type: 'text',
            content: 'I have checked package.json and will proceed with the update.',
        })
    })

    it('handles unclosed <thought> tags during streaming without crashing', () => {
        const streamingContent = '<thought>Currently analyzing the codebase'

        const segments = parseInlineThoughtBlocks(streamingContent, true)
        expect(segments).toHaveLength(1)
        expect(segments[0]).toEqual({
            type: 'thought',
            content: 'Currently analyzing the codebase',
            tokenCount: 5,
            isStreaming: true,
        })
    })

    it('returns regular text when no thought tags are present', () => {
        const regularContent = 'Here is the summary of project changes.'
        const segments = parseInlineThoughtBlocks(regularContent)

        expect(segments).toHaveLength(1)
        expect(segments[0]).toEqual({
            type: 'text',
            content: 'Here is the summary of project changes.',
        })
    })
})
