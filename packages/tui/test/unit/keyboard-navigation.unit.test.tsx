import { describe, expect, it, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { AskQuestionMenu } from '../../src/components/menus/ask-question-menu'

describe('TUI Keyboard Navigation (Unit)', () => {
    it('handles choice selection in AskQuestionMenu', () => {
        const onCompleteMock = mock()
        const questions = [
            {
                question: 'Which framework do you prefer?',
                options: ['Next.js', 'Remix'],
                is_multi_select: false,
            },
        ]

        const { stdin, lastFrame } = render(
            <AskQuestionMenu questions={questions} onComplete={onCompleteMock} />
        )

        expect(lastFrame()).toContain('Which framework do you prefer?')
        expect(lastFrame()).toContain('Next.js')
        expect(lastFrame()).toContain('Remix')

        // Simulate enter keypress
        stdin.write('\r')
        expect(onCompleteMock).toHaveBeenCalledWith('Next.js')
    })
})
