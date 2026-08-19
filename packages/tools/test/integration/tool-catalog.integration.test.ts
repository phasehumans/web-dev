import { describe, expect, it } from 'bun:test'

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
} from '../../src/index'

describe('Tool Catalog Schema & Contract Conformance (Integration)', () => {
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

    it('exports all standard tools with valid names, descriptions, and schemas', () => {
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

    it('ensures distinct tool names across entire tool catalog', () => {
        const names = allTools.map((t) => t.name)
        const uniqueNames = new Set(names)
        expect(uniqueNames.size).toBe(names.length)
    })
})
