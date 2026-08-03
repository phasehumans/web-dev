import { describe, expect, test, mock } from 'bun:test'

import { BrowserTool } from '../../src/browser'
import { createMockContext } from '../mock-context'

describe('BrowserTool (Unit)', () => {
    test('should fetch and format text successfully', async () => {
        const context = createMockContext()
        context.operations.browser = {
            navigate: mock(async () => ({ text: 'Webpage text content', status: 200 })),
        }

        const result = await BrowserTool.execute({ url: 'https://example.com' }, context)
        expect(context.operations.browser.navigate).toHaveBeenCalledWith('https://example.com')
        expect(result).toBe('Webpage text content')
    })

    test('should append VNC stream URL when present', async () => {
        const context = createMockContext()
        context.operations.browser = {
            navigate: mock(async () => ({
                text: 'UI Page',
                vncUrl: 'http://localhost:6080/vnc.html',
            })),
        }

        const result = await BrowserTool.execute({ url: 'https://app.example.com' }, context)
        expect(result).toContain('UI Page')
        expect(result).toContain('[VNC STREAM STARTED: http://localhost:6080/vnc.html]')
    })

    test('should handle navigation errors gracefully', async () => {
        const context = createMockContext()
        context.operations.browser = {
            navigate: mock(async () => ({ text: '', error: 'HTTP 404 Not Found' })),
        }

        const result = await BrowserTool.execute({ url: 'https://example.com/404' }, context)
        expect(result).toBe('Failed to fetch URL: HTTP 404 Not Found')
    })

    test('should fail if environment does not support browser', async () => {
        const context = createMockContext()
        delete context.operations.browser

        const result = await BrowserTool.execute({ url: 'https://example.com' }, context)
        expect(result).toContain(
            'Failed to fetch URL: Browser operations are not supported in this environment.'
        )
    })
})
