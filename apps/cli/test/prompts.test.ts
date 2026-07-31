import { describe, test, expect } from 'bun:test'

import { getGrillPrompt, getPlanPrompt } from '../src/constants/prompts'

describe('CLI Prompts (Unit)', () => {
    test('getGrillPrompt generates structured JSON instructions without context', () => {
        const prompt = getGrillPrompt('Add Dark Mode')
        expect(prompt).toContain('The user wants to implement: "Add Dark Mode"')
        expect(prompt).toContain('5 to 8 targeted, high-impact multiple-choice questions')
        expect(prompt).toContain('Return the output strictly as a JSON array')
        expect(prompt).not.toContain('<project_context>')
    })

    test('getGrillPrompt includes projectContext when provided', () => {
        const context = 'AGENTS.md rules: Use TailwindCSS, React 18, and Vite'
        const prompt = getGrillPrompt('Add Dark Mode', context)
        expect(prompt).toContain('<project_context>')
        expect(prompt).toContain(context)
        expect(prompt).toContain('Leverage the provided project context')
    })

    test('getPlanPrompt formats QA pairs correctly', () => {
        const prompt = getPlanPrompt('Add Dark Mode', [
            { question: 'Which theme strategy?', answer: 'CSS Variables' },
        ])
        expect(prompt).toContain('Q: Which theme strategy?')
        expect(prompt).toContain('A: CSS Variables')
        expect(prompt).toContain('### Implementation Plan')
    })
})
