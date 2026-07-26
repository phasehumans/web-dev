import { ToolExecuteContext } from '@december/shared'
import { describe, expect, test, mock } from 'bun:test'

import { BrowserTool } from '../../src/browser'

describe('BrowserTool', () => {
    test('should fetch and format text successfully', async () => {
        const context = {
            operations: {
                browser: {
                    navigate: mock(async () => {
                        return { text: 'Clean text content', vncUrl: 'ws://localhost:6080' }
                    }),
                },
            },
        } as unknown as ToolExecuteContext

        const result = await BrowserTool.execute({ url: 'https://example.com' }, context)

        expect(result).toContain('Clean text content')
        expect(result).toContain('[VNC STREAM STARTED: ws://localhost:6080]')
    })

    test('should handle navigation errors gracefully', async () => {
        const context = {
            operations: {
                browser: {
                    navigate: mock(async () => {
                        return { text: '', error: 'HTTP Error (404)' }
                    }),
                },
            },
        } as unknown as ToolExecuteContext

        const result = await BrowserTool.execute({ url: 'https://example.com' }, context)

        expect(result).toBe('Failed to fetch URL: HTTP Error (404)')
    })

    test('should fail if environment does not support browser', async () => {
        const context = {
            operations: {}, // no browser property
        } as unknown as ToolExecuteContext

        const result = await BrowserTool.execute({ url: 'https://example.com' }, context)

        expect(result).toBe(
            'Failed to fetch URL: Browser operations are not supported in this environment.'
        )
    })
})
