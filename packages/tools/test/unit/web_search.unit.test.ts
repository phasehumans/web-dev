import { describe, expect, test, mock, afterEach } from 'bun:test'

import { WebSearchTool } from '../../src/web_search'
import { createMockContext } from '../mock-context'

describe('WebSearchTool (Unit)', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    test('should scrape DuckDuckGo results successfully', async () => {
        const mockHtml = `
            <div class="result">
                <a class="result__title">Example Title</a>
                <a class="result__url" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com"></a>
                <div class="result__snippet">Example snippet text</div>
            </div>
        `

        globalThis.fetch = mock(async () => ({
            ok: true,
            status: 200,
            text: async () => mockHtml,
        })) as any

        const context = createMockContext()
        const result = await WebSearchTool.execute({ query: 'example search' }, context)

        expect(result).toContain('Search Results for "example search":')
        expect(result).toContain('1. Example Title')
        expect(result).toContain('URL: https://example.com')
        expect(result).toContain('Snippet: Example snippet text')
    })

    test('should handle HTTP error status gracefully', async () => {
        globalThis.fetch = mock(async () => ({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
        })) as any

        const context = createMockContext()
        const result = await WebSearchTool.execute({ query: 'test' }, context)

        expect(result).toBe('Search failed with status 503: Service Unavailable')
    })

    test('should handle empty results gracefully', async () => {
        globalThis.fetch = mock(async () => ({
            ok: true,
            status: 200,
            text: async () => '<html><body></body></html>',
        })) as any

        const context = createMockContext()
        const result = await WebSearchTool.execute({ query: 'nonexistent query 1234' }, context)

        expect(result).toBe('No search results found.')
    })

    test('should handle network fetch exceptions gracefully', async () => {
        globalThis.fetch = mock(async () => {
            throw new Error('Network timeout')
        }) as any

        const context = createMockContext()
        const result = await WebSearchTool.execute({ query: 'test' }, context)

        expect(result).toBe('Failed to execute web search: Network timeout')
    })
})
