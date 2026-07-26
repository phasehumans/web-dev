import { describe, expect, test, mock } from 'bun:test'

import { AskQuestionTool } from '../../src/ask_question'
import { createMockContext } from '../helpers/mock-context'

describe('AskQuestionTool', () => {
    test('should ask question successfully', async () => {
        const context = createMockContext()
        context.operations.ui.askQuestion = mock(async () => 'Option A')

        const result = await AskQuestionTool.execute(
            { questions: [{ question: 'Q1', options: ['A', 'B'] }] },
            context
        )

        expect(context.operations.ui.askQuestion).toHaveBeenCalled()
        expect(result).toBe('Option A')
    })
})
