import { describe, expect, test } from 'bun:test'

import { AskQuestionTool } from '../../src/ask_question'
import { BashTool } from '../../src/bash'
import { EditFileTool } from '../../src/edit'
import { EditDiffTool } from '../../src/edit_diff'
import { FindFilesTool } from '../../src/find'
import { GrepSearchTool } from '../../src/grep'
import { LsTool } from '../../src/ls'
import { ManageTaskTool } from '../../src/manage_task'
import { ReadFileTool } from '../../src/read'
import { SubagentTool } from '../../src/subagent'
import { WebSearchTool } from '../../src/web_search'
import { WriteFileTool } from '../../src/write'

describe('Tools Schema & Registration (Unit)', () => {
    test('AskQuestionTool has correct metadata', () => {
        expect(AskQuestionTool.name).toBe('ask_question')
        expect(AskQuestionTool.description).toBeDefined()
        expect(AskQuestionTool.inputSchema).toBeDefined()
    })

    test('ReadFileTool has correct metadata', () => {
        expect(ReadFileTool.name).toBe('read_file')
        expect(ReadFileTool.description).toBeDefined()
        expect(ReadFileTool.inputSchema).toBeDefined()
    })

    test('WriteFileTool has correct metadata', () => {
        expect(WriteFileTool.name).toBe('write_file')
        expect(WriteFileTool.description).toBeDefined()
    })

    test('EditFileTool and EditDiffTool have correct metadata', () => {
        expect(EditFileTool.name).toBe('edit_file')
        expect(EditDiffTool.name).toBe('edit_diff')
    })

    test('Search tools (find, grep, ls) have correct names', () => {
        expect(FindFilesTool.name).toBe('find_files')
        expect(GrepSearchTool.name).toBe('grep_search')
        expect(LsTool.name).toBe('list_dir')
    })

    test('Process tools (bash, manage_task, subagent) have correct names', () => {
        expect(BashTool.name).toBe('bash')
        expect(ManageTaskTool.name).toBe('manage_task')
        expect(SubagentTool.name).toBe('invoke_subagent')
    })

    test('Web tools (web_search) have correct names', () => {
        expect(WebSearchTool.name).toBe('web_search')
    })
})
