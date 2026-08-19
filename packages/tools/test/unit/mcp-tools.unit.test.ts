import { describe, expect, it } from 'bun:test'

import { MCPTool, configureMCP } from '../../src/mcp'
import { createMockContext } from '../mock-context'

describe('MCP Tool Wrapper (Unit)', () => {
    it('returns error when requested MCP server is not configured', async () => {
        configureMCP({})
        const context = createMockContext()
        const result = await MCPTool.execute(
            { server: 'unconfigured-server', tool: 'my_tool', args: {} },
            context
        )

        expect(result).toContain("MCP server 'unconfigured-server' not found")
    })

    it('validates tool schema and properties', () => {
        expect(MCPTool.name).toBe('mcp')
        expect(MCPTool.inputSchema.properties.server).toBeDefined()
        expect(MCPTool.inputSchema.properties.tool).toBeDefined()
        expect(MCPTool.inputSchema.required).toEqual(['server', 'tool'])
    })
})
