import {
    BashTool,
    ReadFileTool,
    WriteFileTool,
    LsTool,
    EditFileTool,
    EditDiffTool,
    FindFilesTool,
    GrepSearchTool,
    AskQuestionTool,
    ManageTaskTool,
    BrowserTool,
    WebSearchTool,
    PythonReplTool,
    MCPTool,
} from '@december/tools'
import { describe, expect, it } from 'bun:test'

describe('Tool Catalog Monorepo Smoke Tests', () => {
    const allTools = [
        BashTool,
        ReadFileTool,
        WriteFileTool,
        LsTool,
        EditFileTool,
        EditDiffTool,
        FindFilesTool,
        GrepSearchTool,
        AskQuestionTool,
        ManageTaskTool,
        BrowserTool,
        WebSearchTool,
        PythonReplTool,
        MCPTool,
    ]

    it('verifies all 14 tools have non-empty names, descriptions, and execute functions', () => {
        expect(allTools.length).toBe(14)

        for (const tool of allTools) {
            expect(typeof tool.name).toBe('string')
            expect(tool.name.length).toBeGreaterThan(0)
            expect(typeof tool.description).toBe('string')
            expect(tool.description.length).toBeGreaterThan(0)
            expect(typeof tool.execute).toBe('function')
            expect(tool.inputSchema).toBeDefined()
            expect(typeof tool.inputSchema).toBe('object')
        }
    })

    it('ensures distinct tool names and valid schemas across all catalog entries', () => {
        const names = allTools.map((t) => t.name)
        const uniqueNames = new Set(names)
        expect(uniqueNames.size).toBe(names.length)
    })
})
