import { describe, expect, test, mock } from 'bun:test'

import { AskQuestionTool } from '../../src/ask_question'
import { createMockContext } from '../mock-context'

describe('AskQuestionTool (Unit)', () => {
    test('should ask question successfully when ui operations are available', async () => {
        const context = createMockContext()
        context.operations.ui.askQuestion = mock(async () => 'Option A')

        const result = await AskQuestionTool.execute(
            { questions: [{ question: 'Q1', options: ['A', 'B'] }] },
            context
        )

        expect(context.operations.ui.askQuestion).toHaveBeenCalledWith([
            { question: 'Q1', options: ['A', 'B'] },
        ])
        expect(result).toBe('Option A')
    })

    test('should return error string if interactive ui is unsupported in environment', async () => {
        const context = createMockContext()
        delete context.operations.ui.askQuestion

        const result = await AskQuestionTool.execute(
            { questions: [{ question: 'Q1', options: ['A', 'B'] }] },
            context
        )

        expect(result).toBe('Error: Interactive menus are only supported in the TUI.')
    })
})
