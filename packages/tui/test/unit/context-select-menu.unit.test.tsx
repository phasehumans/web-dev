import { describe, expect, it } from 'bun:test'
import React from 'react'

import { ContextSelectMenu } from '../../src/components/menus/context-select-menu'
import { renderWithProviders } from '../test-providers'

describe('ContextSelectMenu Component (Unit)', () => {
    it('renders the 200-dot visual grid and all flat categorical token breakdown lines', () => {
        const base = 'You are December, an expert coding agent.'
        const skills = 'Available Skills:\n- Code refactoring\n- Performance tuning'
        const rules =
            '<project_context>\n<project_instructions path="AGENTS.md">\nFollow style guidelines\n</project_instructions>\n</project_context>'
        const env = 'Current date: 2026-08-19\nCurrent working directory: /home/workspace'
        const systemPrompt = `${base}\n\n${skills}\n\n${rules}\n\n${env}`

        const mockAgent = {
            systemPrompt,
            modelOptions: { model: 'gemini-3.6-flash' },
            tools: new Map([
                [
                    'read_file',
                    {
                        name: 'read_file',
                        description: 'Read file contents',
                        inputSchema: { type: 'object' },
                    },
                ],
                [
                    'edit_file',
                    {
                        name: 'edit_file',
                        description: 'Edit a file',
                        inputSchema: { type: 'object' },
                    },
                ],
                [
                    'github__list_issues',
                    {
                        name: 'github__list_issues',
                        description: 'List github issues',
                        inputSchema: { type: 'object' },
                    },
                ],
            ]),
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Inspect the codebase context distribution.' },
                {
                    role: 'assistant',
                    content: 'I will analyze the context distribution.',
                    toolCalls: [{ id: 'tc-1', name: 'read_file', input: '{"path":"README.md"}' }],
                },
                { role: 'tool', content: '# Project README\nDocumentation content here.' },
            ],
        }

        const { lastFrame } = renderWithProviders(<ContextSelectMenu agent={mockAgent} />)
        const frame = lastFrame()

        // Verify title & model header
        expect(frame).toContain('Context')
        expect(frame).toContain('gemini-3.6-flash')
        expect(frame).toContain('Token usage by category')

        // Verify flat category breakdown lines
        expect(frame).toContain('Base System Prompt:')
        expect(frame).toContain('Project Rules (AGENTS.md / rules.md):')
        expect(frame).toContain('Workspace Skills (skills.md):')
        expect(frame).toContain('Built-in Tool Schemas:')
        expect(frame).toContain('Dynamic MCP Tools:')
        expect(frame).toContain('Conversation History:')
        expect(frame).toContain('Free space:')
        expect(frame).toContain('Cacheable static prefix:')

        // Verify dots and grid glyphs
        expect(frame).toContain('●')
        expect(frame).toContain('□')
        expect(frame).toContain('★')

        // Verify esc Cancel is rendered on the left
        expect(frame).toContain('esc')
        expect(frame).toContain('Cancel')
    })

    it('renders safely when agent is empty or undefined', () => {
        const { lastFrame } = renderWithProviders(<ContextSelectMenu agent={undefined} />)
        const frame = lastFrame()

        expect(frame).toContain('Context')
        expect(frame).toContain('Token usage by category')
        expect(frame).toContain('Base System Prompt: 0 tokens')
        expect(frame).toContain('Project Rules (AGENTS.md / rules.md): 0 tokens')
        expect(frame).toContain('Workspace Skills (skills.md): 0 tokens')
        expect(frame).toContain('Built-in Tool Schemas: 0 tokens')
        expect(frame).toContain('Dynamic MCP Tools: 0 tokens')
        expect(frame).toContain('Conversation History: 0 tokens')
        expect(frame).toContain('Free space:')
        expect(frame).toContain('Cacheable static prefix: 0 tokens')
    })
})
