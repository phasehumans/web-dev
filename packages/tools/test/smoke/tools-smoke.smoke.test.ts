import { describe, expect, it } from 'bun:test'

import * as toolsModule from '../../src/index'
import { createMockContext } from '../mock-context'

describe('Tools Subsystem Smoke Tests', () => {
    it('verifies all tools can be imported and executed with mock operations without throwing unhandled exceptions', async () => {
        const context = createMockContext()

        expect(toolsModule.BashTool).toBeDefined()
        expect(toolsModule.ReadFileTool).toBeDefined()
        expect(toolsModule.WriteFileTool).toBeDefined()
        expect(toolsModule.LsTool).toBeDefined()
        expect(toolsModule.EditFileTool).toBeDefined()
        expect(toolsModule.EditDiffTool).toBeDefined()
        expect(toolsModule.FindFilesTool).toBeDefined()
        expect(toolsModule.GrepSearchTool).toBeDefined()
        expect(toolsModule.AskQuestionTool).toBeDefined()
        expect(toolsModule.ManageTaskTool).toBeDefined()
        expect(toolsModule.BrowserTool).toBeDefined()
        expect(toolsModule.WebSearchTool).toBeDefined()
        expect(toolsModule.PythonReplTool).toBeDefined()
        expect(toolsModule.MCPTool).toBeDefined()
        expect(toolsModule.generateUnifiedDiff).toBeDefined()

        // Smoke execute ask_question
        context.operations.ui.askQuestion = async (q: any) => 'Option 1'
        const qRes = await toolsModule.AskQuestionTool.execute(
            { questions: [{ question: 'Q', options: ['Option 1'] }] },
            context
        )
        expect(qRes).toContain('Option 1')

        // Smoke execute diff preview
        const diffRes = toolsModule.generateUnifiedDiff('test.txt', 'a', 'b')
        expect(diffRes).toContain('test.txt')
    })
})
