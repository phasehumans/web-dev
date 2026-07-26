import { describe, expect, test, mock, afterAll } from 'bun:test'

import { WebSearchTool } from '../../src/web_search'
import { createMockContext } from '../helpers/mock-context'

describe('WebSearchTool', () => {
    const originalFetch = global.fetch

    afterAll(() => {
        global.fetch = originalFetch
    })

    test('should scrape DuckDuckGo results successfully', async () => {
        const context = createMockContext()

        global.fetch = mock(async () => {
            return new Response(
                `
                <html>
                    <body>
                        <div class="result">
                            <a class="result__url" href="//duckduckgo.com/l/?uddg=https://example.com"></a>
                            <h2 class="result__title">Example Domain</h2>
                            <a class="result__snippet">This domain is for use in illustrative examples</a>
                        </div>
                    </body>
                </html>
            `,
                { status: 200 }
            )
        }) as any

        const result = await WebSearchTool.execute({ query: 'example' }, context)

        expect(result).toContain('Example Domain')
        expect(result).toContain('https://example.com')
        expect(result).toContain('This domain is for use')
    })

    test('should handle empty results gracefully', async () => {
        const context = createMockContext()

        global.fetch = mock(async () => {
            return new Response('<html><body></body></html>', { status: 200 })
        }) as any

        const result = await WebSearchTool.execute({ query: 'asdfasdf' }, context)

        expect(result).toBe('No search results found.')
    })
})
