import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import React from 'react'

import { AskQuestionMenu } from '../../src/components/menus/ask-question-menu'

describe('AskQuestionMenu Component (Unit)', () => {
    it('renders single-select question and selects option with Enter', () => {
        const onComplete = mock()
        const questions = [
            {
                question: 'Which framework to use?',
                options: ['Next.js', 'Remix', 'Vite'],
                is_multi_select: false,
            },
        ]
        const { lastFrame, stdin } = render(
            <AskQuestionMenu questions={questions} onComplete={onComplete} />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Which framework to use?')
        expect(output).toContain('Next.js')
        expect(output).toContain('Remix')

        stdin.write('\r')
        expect(onComplete).toHaveBeenCalledWith('Next.js')
    })

    it('renders multi-select question with checkboxes, toggles with Space, and submits array on Enter', () => {
        const onComplete = mock()
        const questions = [
            {
                question: 'Select components to build:',
                options: ['Header', 'Sidebar', 'Footer'],
                is_multi_select: true,
            },
        ]
        const { lastFrame, stdin } = render(
            <AskQuestionMenu questions={questions} onComplete={onComplete} />
        )
        const output = lastFrame() || ''

        expect(output).toContain('Select components to build:')
        expect(output).toContain('[ ]')
        expect(output).toContain('Header')

        // Toggle first option (Header)
        stdin.write(' ')
        // Move down to Sidebar
        stdin.write('\u001B[B')
        // Toggle second option (Sidebar)
        stdin.write(' ')
        // Submit
        stdin.write('\r')

        expect(onComplete).toHaveBeenCalledWith(['Header', 'Sidebar'])
    })
})
