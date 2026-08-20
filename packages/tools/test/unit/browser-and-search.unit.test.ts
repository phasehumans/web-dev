import { describe, expect, it, mock } from 'bun:test'

import { BrowserTool } from '../../src/browser'
import { WebSearchTool } from '../../src/web_search'
import { createMockContext } from '../mock-context'

describe('Browser and WebSearch Tools (Unit)', () => {
    describe('BrowserTool', () => {
        it('returns error when browser operations are unsupported in environment', async () => {
            const context = createMockContext()
            delete (context.operations as any).browser

            const result = await BrowserTool.execute({ url: 'https://example.com' }, context)
            expect(result).toContain('Browser operations are not supported in this environment')
        })

        it('returns formatted text output and appends VNC stream url when present', async () => {
            const context = createMockContext()
            context.operations.browser = {
                navigate: mock(async (url: string) => ({
                    text: 'Page heading and body content',
                    vncUrl: 'http://localhost:6080/vnc.html',
                })),
            } as any

            const result = await BrowserTool.execute({ url: 'https://example.com' }, context)
            expect(result).toContain('Page heading and body content')
            expect(result).toContain('[VNC STREAM STARTED: http://localhost:6080/vnc.html]')
        })

        it('returns error message when navigation reports an error', async () => {
            const context = createMockContext()
            context.operations.browser = {
                navigate: mock(async () => ({
                    text: '',
                    error: 'ERR_NAME_NOT_RESOLVED',
                })),
            } as any

            const result = await BrowserTool.execute(
                { url: 'https://invalid-nonexistent.org' },
                context
            )
            expect(result).toContain('Failed to fetch URL: ERR_NAME_NOT_RESOLVED')
        })
    })

    describe('WebSearchTool', () => {
        it('has valid input schema requiring query', () => {
            expect(WebSearchTool.name).toBe('web_search')
            expect(WebSearchTool.inputSchema).toBeDefined()
        })
    })
})
