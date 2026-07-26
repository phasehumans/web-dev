import { describe, expect, test, mock, afterAll } from 'bun:test'

import { GitHubTool } from '../../src/github'
import { createMockContext } from '../mock-context'

describe('GitHubTool', () => {
    const originalFetch = global.fetch

    afterAll(() => {
        global.fetch = originalFetch
    })

    test('should fetch github api successfully and use env token', async () => {
        const context = createMockContext()
        context.operations.env.get = mock((key) =>
            key === 'GITHUB_TOKEN' ? 'fake-token' : undefined
        )

        global.fetch = mock(async (url, init) => {
            return new Response(JSON.stringify({ login: 'chaitanya' }), { status: 200 })
        }) as any

        const result = await GitHubTool.execute({ endpoint: '/user' }, context)

        expect(context.operations.env.get).toHaveBeenCalledWith('GITHUB_TOKEN')
        expect(result).toContain('chaitanya')
    })

    test('should handle github api errors', async () => {
        const context = createMockContext()

        global.fetch = mock(async () => {
            return new Response('Not Found', { status: 404 })
        }) as any

        const result = await GitHubTool.execute({ endpoint: '/missing' }, context)
        expect(result).toContain('GitHub API Error (404)')
    })
})
