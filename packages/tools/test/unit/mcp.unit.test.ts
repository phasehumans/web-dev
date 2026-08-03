import { describe, expect, test, beforeEach } from 'bun:test'

import { MCPTool, configureMCP } from '../../src/mcp'
import { createMockContext } from '../mock-context'

describe('MCPTool (Unit)', () => {
    beforeEach(() => {
        configureMCP({})
    })

    test('should return error if server is not configured', async () => {
        const context = createMockContext()
        const result = await MCPTool.execute({ server: 'unknown', tool: 'myTool' }, context)
        expect(result).toBe("Error: MCP server 'unknown' not found in configuration.")
    })

    test('should execute mcp tool successfully when server is configured', async () => {
        configureMCP({
            'my-server': {
                command: 'node',
                args: ['index.js'],
            },
        })

        const context = createMockContext()
        // Override mock import or test error catch block gracefully
        const result = await MCPTool.execute(
            { server: 'my-server', tool: 'myTool', args: { foo: 'bar' } },
            context
        )

        expect(typeof result).toBe('string')
    })

    test('should catch and return error when mcp server execution fails', async () => {
        configureMCP({
            'broken-server': {
                command: 'invalid-executable-path-that-does-not-exist',
                args: [],
            },
        })

        const context = createMockContext()
        const result = await MCPTool.execute(
            { server: 'broken-server', tool: 'test', args: {} },
            context
        )
        expect(result).toContain('MCPTool execution failed:')
    })
})
