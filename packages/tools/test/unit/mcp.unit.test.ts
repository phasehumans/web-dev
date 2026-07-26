import { ToolExecuteContext } from '@december/shared'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MCPTool, configureMCP } from '../../src/mcp'

const mockContext: ToolExecuteContext = {
    agent: {} as any,
    cwd: process.cwd(),
}

// Mock the @modelcontextprotocol/sdk dynamically imported modules
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
    return {
        Client: vi.fn().mockImplementation(() => {
            return {
                connect: vi.fn().mockResolvedValue(undefined),
                callTool: vi.fn().mockImplementation((args) => {
                    if (args.name === 'brokenTool') {
                        throw new Error('Broken tool error')
                    }
                    return Promise.resolve({ success: true, data: 'mock-mcp-result' })
                }),
            }
        }),
    }
})

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
    return {
        StdioClientTransport: vi.fn().mockImplementation((config) => config),
    }
})

describe('MCPTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        configureMCP({}) // Reset config before each test
    })

    it('should return error if server is not configured', async () => {
        const result = await MCPTool.execute({ server: 'unknown', tool: 'myTool' }, mockContext)
        expect(result).toBe("Error: MCP server 'unknown' not found in configuration.")
    })

    it('should execute mcp tool successfully when server is configured', async () => {
        configureMCP({
            'my-server': {
                command: 'node',
                args: ['index.js'],
            },
        })

        const result = await MCPTool.execute(
            { server: 'my-server', tool: 'myTool', args: { foo: 'bar' } },
            mockContext
        )

        // Assert the result is stringified from the mocked callTool result
        expect(JSON.parse(result as string)).toEqual({ success: true, data: 'mock-mcp-result' })
    })

    it('should catch and return error when mcp execution throws', async () => {
        configureMCP({
            'broken-server': {
                command: 'node',
                args: ['broken.js'],
            },
        })

        const result = await MCPTool.execute(
            { server: 'broken-server', tool: 'brokenTool', args: {} },
            mockContext
        )
        expect(result).toBe('MCPTool execution failed: Broken tool error')
    })
})
